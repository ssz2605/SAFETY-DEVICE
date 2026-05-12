import React from 'react';
import { formatDistanceToNow } from 'date-fns';

const LEVEL_CONFIG = {
  EMERGENCY: { color: '#e53e3e', bg: '#fff5f5', icon: '🚨', priority: '0 — FIRST' },
  CRITICAL:  { color: '#dd6b20', bg: '#fffaf0', icon: '🔴', priority: '1 — SECOND' },
  MILD:      { color: '#d69e2e', bg: '#fffff0', icon: '⚠️',  priority: '2 — THIRD' },
  NORMAL:    { color: '#38a169', bg: '#f0fff4', icon: '✅', priority: '3 — LAST' },
};

export default function AlertQueue({ queue, stats, onResolve }) {
  const pending = queue.filter(a => a.status === 'QUEUED' || a.status === 'PROCESSING');

  return (
    <div className="alert-queue">

      <div className="queue-header">
        <div>
          <h2>🚦 Live Priority Queue</h2>
          <p className="queue-subtitle">
            Alerts are processed in order of severity — Emergency first, then Critical, then Mild.
            Within the same level, oldest alert is processed first (FIFO).
          </p>
        </div>
        {stats && (
          <div className="queue-summary">
            <QueueBadge label="Emergency" count={stats.byCriticality?.EMERGENCY || 0} color="#e53e3e" />
            <QueueBadge label="Critical"  count={stats.byCriticality?.CRITICAL  || 0} color="#dd6b20" />
            <QueueBadge label="Mild"      count={stats.byCriticality?.MILD      || 0} color="#d69e2e" />
          </div>
        )}
      </div>

      {/* ── Scheduling Explanation ───────────────────── */}
      <div className="scheduling-diagram">
        <h3>📐 Scheduling & Sequencing Logic</h3>
        <div className="sequence-flow">
          {['EMERGENCY', 'CRITICAL', 'MILD', 'NORMAL'].map((level, idx) => {
            const cfg = LEVEL_CONFIG[level];
            return (
              <React.Fragment key={level}>
                <div className="seq-node" style={{ background: cfg.bg, border: `2px solid ${cfg.color}` }}>
                  <span>{cfg.icon}</span>
                  <strong style={{ color: cfg.color }}>{level}</strong>
                  <small>Priority {idx}</small>
                  <small>Level {3 - idx}</small>
                </div>
                {idx < 3 && <div className="seq-arrow">→</div>}
              </React.Fragment>
            );
          })}
        </div>
        <p className="seq-note">
          Like ambulance dispatch: most critical patient goes first. Within same priority → oldest queued first (FIFO).
        </p>
      </div>

      {/* ── Queue Items ──────────────────────────────── */}
      {pending.length === 0 ? (
        <div className="queue-empty">
          <span>✅</span>
          <p>Queue is clear — no pending alerts</p>
        </div>
      ) : (
        <div className="queue-list">
          <div className="queue-list-header">
            <span>#</span>
            <span>Priority</span>
            <span>Level</span>
            <span>Device</span>
            <span>Sensor Data</span>
            <span>Waiting</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          {pending.map((alert, idx) => {
            const cfg = LEVEL_CONFIG[alert.levelLabel] || LEVEL_CONFIG.NORMAL;
            return (
              <div
                key={alert._id}
                className={`queue-item ${alert.status === 'PROCESSING' ? 'processing' : ''}`}
                style={{ borderLeft: `5px solid ${cfg.color}`, background: idx === 0 ? cfg.bg : undefined }}
              >
                <span className="q-pos">
                  {idx === 0 ? '▶' : idx + 1}
                </span>
                <span className="q-priority" style={{ color: cfg.color }}>
                  P{alert.priority}
                </span>
                <span className="q-level" style={{ color: cfg.color }}>
                  {cfg.icon} {alert.levelLabel}
                </span>
                <span className="q-device">{alert.deviceId}</span>
                <span className="q-data">
                  {alert.sensorData?.temperature}°C &nbsp;
                  {alert.sensorData?.heartRate} BPM &nbsp;
                  {alert.sensorData?.fallDetected && '⚠️ Fall'}
                </span>
                <span className="q-time">
                  {formatDistanceToNow(new Date(alert.queuedAt || alert.createdAt), { addSuffix: true })}
                </span>
                <span className={`q-status status-${alert.status?.toLowerCase()}`}>
                  {alert.status}
                </span>
                <button
                  className="btn-resolve"
                  onClick={() => onResolve(alert._id)}
                >
                  Resolve
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QueueBadge({ label, count, color }) {
  return (
    <div className="q-badge" style={{ background: color }}>
      <strong>{count}</strong>
      <small>{label}</small>
    </div>
  );
}