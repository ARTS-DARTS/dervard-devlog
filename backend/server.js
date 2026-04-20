const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./stats.db');

db.serialize(() => {
  // Таблица для уникальных посетителей за день
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id TEXT,
      date TEXT,
      first_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(visitor_id, date)
    )
  `);
  
  // Таблица для активных сессий с защитой от дублирования
  db.run(`
    CREATE TABLE IF NOT EXISTS active_sessions (
      session_id TEXT PRIMARY KEY,
      visitor_id TEXT,
      ip TEXT,
      user_agent TEXT,
      last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('✅ База данных инициализирована');
});

// Вспомогательная функция для получения IP
const getClientIp = (req) => {
  return req.ip || req.connection.remoteAddress || 'unknown';
};

// API для регистрации посещения
app.post('/api/visit', (req, res) => {
  const { visitorId } = req.body;
  const today = new Date().toISOString().split('T')[0];
  
  if (!visitorId) {
    return res.status(400).json({ error: 'visitorId required' });
  }
  
  db.get(
    'SELECT * FROM daily_visitors WHERE visitor_id = ? AND date = ?',
    [visitorId, today],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      if (!row) {
        db.run(
          'INSERT INTO daily_visitors (visitor_id, date) VALUES (?, ?)',
          [visitorId, today],
          (err) => {
            if (err) {
              console.error('Insert error:', err);
              return res.status(500).json({ error: err.message });
            }
            console.log(`✅ Новый посетитель: ${visitorId}`);
            res.json({ success: true, isNew: true });
          }
        );
      } else {
        res.json({ success: true, isNew: false });
      }
    }
  );
});

// API для heartbeat с защитой
app.post('/api/heartbeat', (req, res) => {
  const { sessionId, visitorId } = req.body;
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  if (!sessionId || !visitorId) {
    return res.status(400).json({ error: 'sessionId and visitorId required' });
  }
  
  // Проверяем, нет ли уже активной сессии с таким же visitorId, IP и User-Agent
  // (защита от множественных вкладок одного пользователя)
  db.get(
    `SELECT session_id FROM active_sessions 
     WHERE visitor_id = ? AND ip = ? AND user_agent = ?
     AND session_id != ?`,
    [visitorId, ip, userAgent, sessionId],
    (err, existing) => {
      if (err) {
        console.error('Check error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      if (existing) {
        // У пользователя уже есть активная сессия, не создаём новую
        // Обновляем существующую
        db.run(
          `UPDATE active_sessions 
           SET last_seen = CURRENT_TIMESTAMP 
           WHERE session_id = ?`,
          [existing.session_id],
          (err) => {
            if (err) console.error('Update error:', err);
            res.json({ success: true, reused: true });
          }
        );
      } else {
        // Создаём или обновляем сессию
        db.run(
          `INSERT INTO active_sessions (session_id, visitor_id, ip, user_agent, last_seen) 
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(session_id) DO UPDATE SET last_seen = CURRENT_TIMESTAMP`,
          [sessionId, visitorId, ip, userAgent],
          (err) => {
            if (err) {
              console.error('Heartbeat error:', err);
              return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
          }
        );
      }
    }
  );
});

// API для получения статистики
app.get('/api/stats', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Удаляем сессии старше 30 секунд
  db.run(
    `DELETE FROM active_sessions 
     WHERE last_seen < datetime('now', '-30 seconds')`,
    (err) => {
      if (err) console.error('Cleanup error:', err);
      
      db.get(
        'SELECT COUNT(*) as count FROM daily_visitors WHERE date = ?',
        [today],
        (err, dailyRow) => {
          if (err) {
            console.error('Stats error:', err);
            return res.status(500).json({ error: err.message });
          }
          
          db.get(
            'SELECT COUNT(*) as count FROM active_sessions',
            (err, onlineRow) => {
              if (err) {
                console.error('Online error:', err);
                return res.status(500).json({ error: err.message });
              }
              
              const response = {
                todayVisits: dailyRow?.count || 0,
                onlineNow: onlineRow?.count || 0,
                timestamp: new Date().toISOString()
              };
              
              console.log(`📊 Статистика: сегодня ${response.todayVisits}, онлайн ${response.onlineNow}`);
              res.json(response);
            }
          );
        }
      );
    }
  );
});

app.listen(PORT, () => {
  console.log(`\n🚀 Сервер статистики запущен!`);
  console.log(`📍 Адрес: http://localhost:${PORT}`);
  console.log(`📊 API статистики: http://localhost:${PORT}/api/stats`);
  console.log(`💾 База данных: stats.db\n`);
});