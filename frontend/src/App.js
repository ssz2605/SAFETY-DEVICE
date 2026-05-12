import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { alertsAPI, devicesAPI, statsAPI } from './services/api';
import Dashboard from './components/Dashboard';
import AlertQueue from './components/AlertQueue';
import AlertHistory from './components/AlertHistory';
import DeviceManager from './components/DeviceManager';
import './App.css';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'queue',     label: '🚨 Live Queue' },
  { id: 'history',   label: '📋 History' },
  { id: 'devices',   label: '📱 Devices' },
];

export default function App() {
  const [tab,        setTab]        = useState('dashboard');
  const [stats,      setStats]      = useState(null);
  const [queue,      setQueue]      = useState([]);
  const [queueStats, setQueueStats] = useState(null);
  const [alerts,     setAlerts]     = useState([]);
  const [devices,    setDevices]    = useState([]);
  const [connected,  setConnected]  = useState(false);
  const [newAlert,   setNewAlert]   = useState(null);  // Toast notification

  // ── Fetch initial data ───────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await statsAPI.get();
      setStats(data.data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      const { data } = await alertsAPI.getQueue();
      setQueue(data.queue || []);
      setQueueStats(data.stats);
    } catch (e) { console.error(e); }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await alertsAPI.getAll({ limit: 50 });
      setAlerts(data.data || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      const { data } = await devicesAPI.getAll();
      setDevices(data.data || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchQueue();
    fetchAlerts();
    fetchDevices();
  }, [fetchStats, fetchQueue, fetchAlerts, fetchDevices]);

  // ── Socket.IO realtime ────────────────────────────────────────
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('alert:new', (alert) => {
      setNewAlert(alert);
      fetchQueue();
      fetchStats();
      fetchAlerts();
      setTimeout(() => setNewAlert(null), 5000);
    });

    socket.on('alert:updated', () => {
      fetchQueue();
      fetchAlerts();
    });

    socket.on('queue:update', (stats) => {
      setQueueStats(stats);
      fetchQueue();
    });

    return () => socket.disconnect();
  }, [fetchQueue, fetchStats, fetchAlerts]);

  const handleResolve = async (alertId) => {
    await alertsAPI.resolve(alertId, 'dashboard-user');
    fetchQueue();
    fetchAlerts();
    fetchStats();
  };

  return (
    <div className="app">
      {/* ── Header ─────────────────────────────────── */}
      <header className="app-header">
        <div className="header-left">
          <span className="logo">🛡️</span>
          <div>
            <h1>CPPS Safety Monitor</h1>
            <p>Cyber Physical Production System : Group 17</p>
          </div>
        </div>
        <div className="header-right">
          <div className={`socket-badge ${connected ? 'live' : 'offline'}`}>
            {connected ? '🟢 Live' : '🔴 Offline'}
          </div>
          {queueStats && (
            <div className="queue-badge">
              Queue: {queueStats.totalQueued} pending
            </div>
          )}
        </div>
      </header>

      {/* ── Alert Toast ──────────────────────────────── */}
      {newAlert && (
        <div className={`toast toast-${newAlert.levelLabel?.toLowerCase()}`}>
          <strong>
            {newAlert.level === 3 ? '🚨' : newAlert.level === 2 ? '🔴' : '⚠️'}&nbsp;
            {newAlert.levelLabel} ALERT
          </strong>
          <span>{newAlert.message}</span>
          <span className="toast-device">Device: {newAlert.deviceId}</span>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────── */}
      <nav className="tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'queue' && queueStats?.totalQueued > 0 && (
              <span className="badge">{queueStats.totalQueued}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ── Content ──────────────────────────────────── */}
      <main className="app-main">
        {tab === 'dashboard' && <Dashboard stats={stats} queueStats={queueStats} alerts={alerts} />}
        {tab === 'queue'     && <AlertQueue queue={queue} stats={queueStats} onResolve={handleResolve} />}
        {tab === 'history'   && <AlertHistory alerts={alerts} onResolve={handleResolve} />}
        {tab === 'devices'   && <DeviceManager devices={devices} onRefresh={fetchDevices} />}
      </main>
    </div>
  );
}