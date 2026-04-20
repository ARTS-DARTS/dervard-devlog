import React, { useState, useEffect } from 'react';
import './StatsWidget.css';

const JSONBIN_BIN_ID = "69d6d01636566621a8914c8f";
const JSONBIN_API_KEY = "$2a$10$11sgWrptIfwQlehYtSaNEuGQKpkG6HT2OBoyIYHeJT51yPaXi1xxW";
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

const StatsWidget = () => {
  const [stats, setStats] = useState({
    todayVisits: null,
    onlineNow: null,
    loading: true,
    error: null
  });

  const getVisitorId = () => {
    let visitorId = localStorage.getItem('visitor_id');
    if (!visitorId) {
      visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('visitor_id', visitorId);
    }
    return visitorId;
  };

  const getSessionId = () => {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${JSONBIN_URL}/latest`, {
        headers: { "X-Master-Key": JSONBIN_API_KEY }
      });
      const data = await response.json();
      const record = data.record;
      
      setStats({
        todayVisits: record.stats?.todayVisits || 0,
        onlineNow: record.stats?.onlineNow || 0,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Fetch stats error:', error);
      setStats(prev => ({
        ...prev,
        loading: false,
        error: 'Не удалось загрузить статистику'
      }));
    }
  };

  const updateStats = async () => {
    const visitorId = getVisitorId();
    const sessionId = getSessionId();
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const response = await fetch(`${JSONBIN_URL}/latest`, {
        headers: { "X-Master-Key": JSONBIN_API_KEY }
      });
      const data = await response.json();
      const record = data.record;
      
      if (!record.stats) {
        record.stats = { todayVisits: 0, onlineNow: 0, activeSessions: {}, dailyVisitors: {} };
      }
      if (!record.stats.activeSessions) record.stats.activeSessions = {};
      if (!record.stats.dailyVisitors) record.stats.dailyVisitors = {};
      
      const now = Date.now();
      let activeCount = 0;
      for (const [sid, lastSeen] of Object.entries(record.stats.activeSessions)) {
        if (now - lastSeen < 30000) {
          activeCount++;
        } else {
          delete record.stats.activeSessions[sid];
        }
      }
      
      if (!record.stats.activeSessions[sessionId]) {
        record.stats.activeSessions[sessionId] = now;
        activeCount++;
      } else {
        record.stats.activeSessions[sessionId] = now;
      }
      
      if (!record.stats.dailyVisitors[today]) {
        record.stats.dailyVisitors[today] = {};
      }
      if (!record.stats.dailyVisitors[today][visitorId]) {
        record.stats.dailyVisitors[today][visitorId] = true;
      }
      
      const todayVisitsCount = Object.keys(record.stats.dailyVisitors[today] || {}).length;
      
      record.stats.onlineNow = activeCount;
      record.stats.todayVisits = todayVisitsCount;
      
      await fetch(JSONBIN_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": JSONBIN_API_KEY
        },
        body: JSON.stringify(record)
      });
      
      setStats({
        todayVisits: todayVisitsCount,
        onlineNow: activeCount,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Update stats error:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    updateStats();
    const interval = setInterval(updateStats, 15000);
    return () => clearInterval(interval);
  }, []);

  if (stats.loading) {
    return (
      <div className="stats-widget-compact loading">
        <span>📊 ...</span>
        <span>🟢 ...</span>
      </div>
    );
  }

  if (stats.error) {
    return null;
  }

  return (
    <div className="stats-widget-compact">
      <div className="stat-compact">
        <span className="stat-icon-compact">📊</span>
        <span className="stat-value-compact">{stats.todayVisits}</span>
      </div>
      <div className="stat-divider-compact"></div>
      <div className="stat-compact online">
        <span className="pulse-dot-compact"></span>
        <span className="stat-value-compact online">{stats.onlineNow}</span>
      </div>
    </div>
  );
};

export default StatsWidget;
