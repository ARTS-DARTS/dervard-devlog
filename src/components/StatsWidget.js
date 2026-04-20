import React, { useState, useEffect } from 'react';
import './StatsWidget.css';

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

  const sendHeartbeat = async () => {
    const sessionId = getSessionId();
    const visitorId = getVisitorId();
    try {
      await fetch('http://localhost:3001/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, visitorId }),
      });
    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  };

  const registerVisit = async () => {
    const visitorId = getVisitorId();
    try {
      await fetch('http://localhost:3001/api/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId }),
      });
    } catch (error) {
      console.error('Ошибка регистрации посещения:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/stats');
      if (!response.ok) throw new Error('Ошибка загрузки статистики');
      const data = await response.json();
      setStats({
        todayVisits: data.todayVisits,
        onlineNow: data.onlineNow,
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

  useEffect(() => {
    registerVisit();
    sendHeartbeat();
    fetchStats();
    
    const heartbeatInterval = setInterval(sendHeartbeat, 15000);
    const statsInterval = setInterval(fetchStats, 10000);
    
    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(statsInterval);
    };
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