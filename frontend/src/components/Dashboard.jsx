import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';

const LEVEL_COLORS = {
  EMERGENCY: '#e53e3e',
  CRITICAL:  '#dd6b20',
  MILD:      '#d69e2e',
  NORMAL:    '#38a169',
};

const LEVEL_BG = {
  EMERGENCY: '#fff5f5',
  CRITICAL:  '#fffaf0',
  MILD:      '#fffff0',
  NORMAL:    '#f0fff4',
};

export default function Dashboard({ stats, queueStats, alerts }) {
  if (!stats) return <div className="loading">Loading dashboard…</div>;

  const byLevel = stats.alerts?.byLevel || {};
  const pieData = Object.entries(byLevel)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  const barData = [
    { name: 'Emergency', count: byLevel.EMERGENCY || 0, fill: '#e53e3e' },
    { name: 'Critical',  count: byLevel.CRITICAL  || 0, fill: '#dd6b20' },
    { name: 'Mild',      count: byLevel.MILD      || 0, fill: '#d69e2e' },
    { name: 'Normal',    count: byLevel.NORMAL    || 0, fill: '#38a169' },
  ];

  const recentActive = alerts.filter(a =>
    a.level >= 1 && a.status !== 'RESOLVED'
  ).slice(0, 5);

  return (
    <div className="dashboard">

      {/* ── Summary Cards ───────────────────────────── */}
      <section className="stat-cards">
        <StatCard
          icon="🚨" label="Emergency" value={byLevel.EMERGENCY || 0}
          color="#e53e3e" bg="#fff5f5"
        />
        <StatCard
          icon="🔴" label="Critical" value={byLevel.CRITICAL || 0}
          color="#dd6b20" bg="#fffaf0"
        />
        <StatCard
          icon="⚠️" label="Mild" value={byLevel.MILD || 0}
          color="#d69e2e" bg="#fffff0"
        />
        <StatCard
          icon="📱" label="Devices" value={stats.devices?.active || 0}
          color="#3182ce" bg="#ebf8ff"
        />
        <StatCard
          icon="📋" label="Total Alerts" value={stats.alerts?.total || 0}
          color="#718096" bg="#f7fafc"
        />
        <StatCard
          icon="⏳" label="In Queue" value={queueStats?.totalQueued || 0}
          color="#805ad5" bg="#faf5ff"
        />
      </section>

      {/* ── Charts ──────────────────────────────────── */}
      <section className="charts">
        <div className="chart-card">
          <h3>Alerts by Severity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 5, right: 20, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Alert Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData} cx="50%" cy="50%"
                innerRadius={55} outerRadius={85}
                dataKey="value" label
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={LEVEL_COLORS[entry.name] || '#999'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Queue State ─────────────────────────────── */}
      {queueStats && (
        <section className="queue-state">
          <h3>Current Queue State</h3>
          <div className="queue-legend">
            <p className="queue-hint">
              ⬇ Processing order: Emergency → Critical → Mild (like ambulance dispatch)
            </p>
            {['EMERGENCY', 'CRITICAL', 'MILD', 'NORMAL'].map(level => (
              <div key={level} className="queue-level-row"
                style={{ borderLeft: `4px solid ${LEVEL_COLORS[level]}`,
                         background: LEVEL_BG[level] }}>
                <span className="queue-level-name">{level}</span>
                <span className="queue-level-count">
                  {queueStats.byCriticality?.[level] || 0} pending
                </span>
                <span className="queue-priority">
                  Priority {level === 'EMERGENCY' ? '0 (FIRST)' :
                             level === 'CRITICAL'  ? '1' :
                             level === 'MILD'      ? '2' : '3 (LAST)'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Recent Active Alerts ─────────────────────── */}
      {recentActive.length > 0 && (
        <section className="recent-alerts">
          <h3>⚡ Active Alerts (Needs Attention)</h3>
          {recentActive.map(a => (
            <AlertRow key={a._id} alert={a} />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }) {
  return (
    <div className="stat-card" style={{ background: bg, borderTop: `3px solid ${color}` }}>
      <span className="stat-icon">{icon}</span>
      <div>
        <div className="stat-value" style={{ color }}>{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function AlertRow({ alert }) {
  return (
    <div className="alert-row" style={{ borderLeft: `4px solid ${LEVEL_COLORS[alert.levelLabel]}` }}>
      <span className="alert-level" style={{ color: LEVEL_COLORS[alert.levelLabel] }}>
        {alert.levelLabel}
      </span>
      <span className="alert-device">{alert.deviceId}</span>
      <span className="alert-msg">{alert.message}</span>
      <span className="alert-time">
        {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
      </span>
      <span className={`alert-status status-${alert.status?.toLowerCase()}`}>{alert.status}</span>
    </div>
  );
}