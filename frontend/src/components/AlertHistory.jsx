import React, { useState } from 'react';
import { format } from 'date-fns';

const LEVEL_COLORS = {
  EMERGENCY: '#e53e3e',
  CRITICAL:  '#dd6b20',
  MILD:      '#d69e2e',
  NORMAL:    '#38a169',
};

const STATUS_COLORS = {
  QUEUED:     '#805ad5',
  PROCESSING: '#3182ce',
  SMS_SENT:   '#38a169',
  RESOLVED:   '#718096',
  FAILED:     '#e53e3e',
};

export default function AlertHistory({ alerts, onResolve }) {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = alerts
  .filter(a => filter === 'ALL' || a.levelLabel === filter)
  .filter(a => !search || a.deviceId?.includes(search) || a.message?.includes(search))
  .sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;

    const score = (alert) => {
      const s = alert.sensorData || {};
      let sc = 0;

      if (s.fallDetected) sc += 50;
      if (s.temperature >= 39.5) sc += 30;
      else if (s.temperature >= 38) sc += 20;
      if (s.heartRate >= 135) sc += 20;
      else if (s.heartRate >= 110) sc += 10;

      return sc;
    };

    return score(b) - score(a);
  });

  return (
    <div className="alert-history">
      <div className="history-toolbar">
        <h2>📋 Alert History</h2>
        <div className="toolbar-controls">
          <input
            className="search-input"
            placeholder="🔍 Search device / message..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="filter-tabs">
            {['ALL', 'EMERGENCY', 'CRITICAL', 'MILD', 'NORMAL'].map(f => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                style={filter === f && LEVEL_COLORS[f] ? { background: LEVEL_COLORS[f], color: '#fff' } : {}}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="history-count">{filtered.length} alerts</div>

      <div className="history-table">
        <div className="history-header">
          <span>Time</span>
          <span>Level</span>
          <span>Device</span>
          <span>Temperature</span>
          <span>Heart Rate</span>
          <span>Fall</span>
          <span>Message</span>
          <span>Status</span>
          <span>SMS</span>
          <span>Action</span>
        </div>

        {filtered.length === 0 && (
          <div className="history-empty">No alerts found</div>
        )}

        {filtered.map(alert => (
          <div
            key={alert._id}
            className="history-row"
            style={{ borderLeft: `4px solid ${LEVEL_COLORS[alert.levelLabel] || '#ccc'}` }}
          >
            <span className="h-time">
              {format(new Date(alert.createdAt), 'dd MMM HH:mm:ss')}
            </span>
            <span className="h-level" style={{ color: LEVEL_COLORS[alert.levelLabel] }}>
              {alert.levelLabel}
            </span>
            <span className="h-device">{alert.deviceId}</span>
            <span className="h-temp">
              {alert.sensorData?.temperature ?? '—'}°C
            </span>
            <span className="h-hr">
              {alert.sensorData?.heartRate ?? '—'} BPM
            </span>
            <span className="h-fall">
              {alert.sensorData?.fallDetected ? '⚠️ Yes' : 'No'}
            </span>
            <span className="h-msg" title={alert.message}>
              {alert.message?.slice(0, 50)}{alert.message?.length > 50 ? '…' : ''}
            </span>
            <span className="h-status" style={{ color: STATUS_COLORS[alert.status] }}>
              {alert.status}
            </span>
            <span className="h-sms">
              {alert.notifications?.some(n => n.status === 'SENT') ? '✅ Sent' : '—'}
            </span>
            <span className="h-action">
              {alert.status !== 'RESOLVED' && alert.level > 0 && (
                <button className="btn-resolve-sm" onClick={() => onResolve(alert._id)}>
                  Resolve
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
} 