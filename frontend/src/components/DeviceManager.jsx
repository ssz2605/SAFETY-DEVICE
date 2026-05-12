import React, { useState } from 'react';
import { devicesAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

export default function DeviceManager({ devices, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    deviceId: '', deviceName: '', patientName: '',
    patientAge: '', condition: '',
    contactName: '', contactPhone: '', contactRelation: '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSubmit = async () => {
    if (!form.deviceId || !form.deviceName || !form.patientName) {
      setMsg('❌ Device ID, Name, and Patient Name are required'); return;
    }
    setSaving(true);
    try {
      await devicesAPI.register({
        deviceId:   form.deviceId,
        deviceName: form.deviceName,
        patientName: form.patientName,
        patientAge: parseInt(form.patientAge) || undefined,
        condition:  form.condition,
        emergencyContacts: form.contactName ? [{
          name:         form.contactName,
          phone:        form.contactPhone,
          relationship: form.contactRelation || 'Family',
          priority:     1,
        }] : [],
      });
      setMsg('✅ Device registered!');
      setShowForm(false);
      onRefresh();
      setForm({ deviceId:'',deviceName:'',patientName:'',patientAge:'',
                condition:'',contactName:'',contactPhone:'',contactRelation:'' });
    } catch (e) {
      setMsg('❌ Error: ' + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="device-manager">
      <div className="dm-header">
        <h2>📱 Device Manager</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '＋ Register Device'}
        </button>
      </div>

      {msg && <div className="msg-banner">{msg}</div>}

      {/* ── Register Form ────────────────────────────── */}
      {showForm && (
        <div className="device-form card">
          <h3>Register New ESP32 Device</h3>
          <div className="form-grid">
            <label>
              Device ID *
              <input placeholder="ESP32-001" value={form.deviceId}
                onChange={e => setForm({ ...form, deviceId: e.target.value })} />
            </label>
            <label>
              Device Name *
              <input placeholder="Safety Device 1" value={form.deviceName}
                onChange={e => setForm({ ...form, deviceName: e.target.value })} />
            </label>
            <label>
              Patient Name *
              <input placeholder="Full name" value={form.patientName}
                onChange={e => setForm({ ...form, patientName: e.target.value })} />
            </label>
            <label>
              Patient Age
              <input type="number" placeholder="Age" value={form.patientAge}
                onChange={e => setForm({ ...form, patientAge: e.target.value })} />
            </label>
            <label>
              Condition
              <input placeholder="Elderly / Child / Post-surgery" value={form.condition}
                onChange={e => setForm({ ...form, condition: e.target.value })} />
            </label>
          </div>

          <h4>Emergency Contact</h4>
          <div className="form-grid">
            <label>
              Contact Name
              <input placeholder="Name" value={form.contactName}
                onChange={e => setForm({ ...form, contactName: e.target.value })} />
            </label>
            <label>
              Phone (E.164)
              <input placeholder="+91XXXXXXXXXX" value={form.contactPhone}
                onChange={e => setForm({ ...form, contactPhone: e.target.value })} />
            </label>
            <label>
              Relationship
              <input placeholder="Family / Doctor" value={form.contactRelation}
                onChange={e => setForm({ ...form, contactRelation: e.target.value })} />
            </label>
          </div>

          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : '💾 Save Device'}
          </button>
        </div>
      )}

      {/* ── Device Cards ─────────────────────────────── */}
      <div className="device-grid">
        {devices.length === 0 && (
          <div className="no-devices">No devices registered yet.</div>
        )}
        {devices.map(d => (
          <div
            key={d._id}
            className={`device-card ${selected?._id === d._id ? 'selected' : ''}`}
            onClick={() => setSelected(selected?._id === d._id ? null : d)}
          >
            <div className="dc-header">
              <span className="dc-icon">📱</span>
              <div>
                <strong>{d.deviceName}</strong>
                <small>{d.deviceId}</small>
              </div>
              <span className={`dc-dot ${d.isActive ? 'active' : 'inactive'}`} />
            </div>

            <div className="dc-patient">
              <span>👤 {d.patientName}</span>
              {d.patientAge && <span>Age: {d.patientAge}</span>}
              {d.condition && <span>{d.condition}</span>}
            </div>

            <div className="dc-meta">
              {d.lastSeen ? (
                <span>🕐 {formatDistanceToNow(new Date(d.lastSeen), { addSuffix: true })}</span>
              ) : (
                <span className="dc-never">Never seen</span>
              )}
              <span>👥 {d.emergencyContacts?.length || 0} contacts</span>
            </div>

            {/* Expanded detail */}
            {selected?._id === d._id && (
              <div className="dc-detail">
                <h4>Emergency Contacts</h4>
                {d.emergencyContacts?.length === 0 && <p className="warn">⚠️ No contacts — add via API or re-register</p>}
                {d.emergencyContacts?.map((c, i) => (
                  <div key={i} className="contact-row">
                    <span>#{c.priority} {c.name}</span>
                    <span>{c.phone}</span>
                    <span>{c.relationship}</span>
                    <span className={c.active ? 'active' : 'inactive'}>{c.active ? 'Active' : 'Off'}</span>
                  </div>
                ))}

                <h4>Alert Thresholds</h4>
                <div className="threshold-grid">
                  <span>🌡️ Temp High: {d.thresholds?.tempHigh ?? 38}°C</span>
                  <span>❤️ HR High: {d.thresholds?.heartRateHigh ?? 120} BPM</span>
                  <span>❤️ HR Low: {d.thresholds?.heartRateLow ?? 50} BPM</span>
                  <span>💥 Fall: {d.thresholds?.accelerationFall ?? 24.5} m/s²</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}