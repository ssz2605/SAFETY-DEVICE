const mongoose = require('mongoose');

// ─────────────────────────────────────────────
//  ALERT LEVELS (from PPT)
//  Level 0 – Normal
//  Level 1 – Mild Alert    (high temp OR abnormal HR for >2 min)
//  Level 2 – Critical      (fall detected, acceleration >2.5g)
//  Level 3 – Emergency     (2+ conditions OR critical lasting >5 min)
// ─────────────────────────────────────────────

const ALERT_LEVELS = {
  NORMAL:    0,
  MILD:      1,
  CRITICAL:  2,
  EMERGENCY: 3,
};

// Priority for scheduling queue — LOWER NUMBER = HIGHER PRIORITY
const PRIORITY_MAP = {
  3: 0,  // Emergency → process first
  2: 1,  // Critical  → process second
  1: 2,  // Mild      → process third
  0: 3,  // Normal    → lowest priority (just logged)
};

const sensorReadingSchema = new mongoose.Schema({
  temperature:   { type: Number, required: true },  // °C
  heartRate:     { type: Number, required: true },  // BPM
  acceleration:  { type: Number, default: 0 },      // m/s²
  fallDetected:  { type: Boolean, default: false },
}, { _id: false });

const alertSchema = new mongoose.Schema({

  // ── Device info ──────────────────────────────
  deviceId:      { type: String, required: true, index: true },
  deviceName:    { type: String, default: 'Unknown Device' },

  // ── Alert classification ──────────────────────
  level: {
    type: Number,
    enum: [0, 1, 2, 3],
    required: true,
    index: true,
  },
  levelLabel: {
    type: String,
    enum: ['NORMAL', 'MILD', 'CRITICAL', 'EMERGENCY'],
    required: true,
  },

  // ── Priority queue field ──────────────────────
  // Lower = higher priority (0 is highest)
  priority: {
    type: Number,
    default: function () { return PRIORITY_MAP[this.level] ?? 3; },
    index: true,
  },

  // ── Sensor data that triggered this alert ─────
  sensorData: { type: sensorReadingSchema, required: true },

  // ── Reason breakdown ─────────────────────────
  triggers: {
    highTemperature:    { type: Boolean, default: false },
    abnormalHeartRate:  { type: Boolean, default: false },
    fallDetected:       { type: Boolean, default: false },
    sustainedCondition: { type: Boolean, default: false },
  },

  // ── Lifecycle ─────────────────────────────────
  status: {
    type: String,
    enum: ['QUEUED', 'PROCESSING', 'SMS_SENT', 'NOTIFIED', 'RESOLVED', 'FAILED'],
    default: 'QUEUED',
    index: true,
  },

  // ── Scheduling metadata ───────────────────────
  queuedAt:     { type: Date, default: Date.now, index: true },
  processedAt:  { type: Date },
  resolvedAt:   { type: Date },
  smsSentAt:    { type: Date },
  resolvedBy:   { type: String },  // user/system

  // ── Notification log ──────────────────────────
  notifications: [{
    type:      { type: String, enum: ['SMS', 'PUSH', 'EMAIL'] },
    sentTo:    String,
    sentAt:    { type: Date, default: Date.now },
    status:    { type: String, enum: ['SENT', 'FAILED', 'PENDING'] },
    errorMsg:  String,
  }],

  // ── Human-readable message ────────────────────
  message: { type: String },

  // ── Location (optional — if GPS added later) ──
  location: {
    lat:  Number,
    lng:  Number,
    address: String,
  },

}, {
  timestamps: true,  // adds createdAt, updatedAt
});

// ── Compound indexes for queue queries ──────────
alertSchema.index({ status: 1, priority: 1, queuedAt: 1 });
alertSchema.index({ deviceId: 1, createdAt: -1 });
alertSchema.index({ level: 1, status: 1, createdAt: -1 });

// ── Virtual: time in queue ───────────────────────
alertSchema.virtual('timeInQueueMs').get(function () {
  if (this.processedAt) return this.processedAt - this.queuedAt;
  return Date.now() - this.queuedAt;
});

// ── Static: build human-readable message ─────────
alertSchema.statics.buildMessage = function (level, triggers, sensorData) {
  const levelNames = { 0: 'Normal', 1: 'Mild Alert', 2: 'Critical Event', 3: 'EMERGENCY' };
  const parts = [`[${levelNames[level]}]`];
  if (triggers.highTemperature)    parts.push(`Temp: ${sensorData.temperature}°C`);
  if (triggers.abnormalHeartRate)  parts.push(`HR: ${sensorData.heartRate} BPM`);
  if (triggers.fallDetected)       parts.push(`Fall detected! Accel: ${sensorData.acceleration} m/s²`);
  if (triggers.sustainedCondition) parts.push('Condition sustained >5min');
  return parts.join(' | ');
};

// ── Pre-save: auto-set priority and levelLabel ───
alertSchema.pre('save', function (next) {
  this.priority   = PRIORITY_MAP[this.level] ?? 3;
  const labels    = { 0: 'NORMAL', 1: 'MILD', 2: 'CRITICAL', 3: 'EMERGENCY' };
  this.levelLabel = labels[this.level] || 'NORMAL';
  next();
});

module.exports = mongoose.model('Alert', alertSchema);
module.exports.ALERT_LEVELS = ALERT_LEVELS;
module.exports.PRIORITY_MAP = PRIORITY_MAP;