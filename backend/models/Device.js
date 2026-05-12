const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  phone:        { type: String, required: true },  // E.164 format: +91XXXXXXXXXX
  relationship: { type: String, default: 'Family' },
  priority:     { type: Number, default: 1 },  // 1 = first to notify
  active:       { type: Boolean, default: true },
}, { _id: true });

const deviceSchema = new mongoose.Schema({

  // ── Identity ──────────────────────────────────
  deviceId:   { type: String, required: true, unique: true, index: true },
  deviceName: { type: String, required: true },
  macAddress: { type: String, unique: true, sparse: true },
  firmware:   { type: String, default: 'v1.0.0' },

  // ── Owner / Patient info ──────────────────────
  patientName: { type: String, required: true },
  patientAge:  { type: Number },
  condition:   { type: String },   // e.g. "Elderly", "Child", "Post-surgery"

  // ── Emergency contacts ─────────────────────────
  emergencyContacts: [emergencyContactSchema],

  // ── Thresholds (tunable per device) ───────────
  thresholds: {
    tempHigh:         { type: Number, default: 38.0 },   // °C
    heartRateHigh:    { type: Number, default: 120 },    // BPM
    heartRateLow:     { type: Number, default: 50 },     // BPM
    accelerationFall: { type: Number, default: 24.5 },   // m/s² ≈ 2.5g
    sustainedMinutes: { type: Number, default: 5 },      // min
  },

  // ── Status ────────────────────────────────────
  isActive:   { type: Boolean, default: true },
  lastSeen:   { type: Date },
  lastAlertAt:{ type: Date },

  // ── Location (static — where the device is deployed) ──
  location: {
    address: String,
    city:    String,
    lat:     Number,
    lng:     Number,
  },

}, {
  timestamps: true,
});

module.exports = mongoose.model('Device', deviceSchema);