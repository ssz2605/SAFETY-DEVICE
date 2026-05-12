/**
 * Seed script — populates DB with demo devices and alerts for testing
 * Run: node scripts/seed.js
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Device   = require('../models/Device');
const Alert    = require('../models/Alert');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cpps_safety_device';

const DEMO_DEVICES = [
  {
    deviceId: 'ESP32-001',
    deviceName: 'Wearable Alpha',
    macAddress: 'AA:BB:CC:DD:EE:01',
    patientName: 'Ramesh Kumar',
    patientAge: 74,
    condition: 'Elderly — post-cardiac surgery',
    emergencyContacts: [
      { name: 'Priya Kumar', phone: '+919876543210', relationship: 'Daughter', priority: 1, active: true },
      { name: 'Dr. Sharma',  phone: '+919876543211', relationship: 'Cardiologist', priority: 2, active: true },
    ],
    location: { address: 'Andheri West', city: 'Mumbai' },
  },
  {
    deviceId: 'ESP32-002',
    deviceName: 'Wearable Beta',
    patientName: 'Anjali Mehta',
    patientAge: 8,
    condition: 'Child — asthma patient',
    emergencyContacts: [
      { name: 'Suresh Mehta', phone: '+919876543220', relationship: 'Father', priority: 1, active: true },
    ],
    location: { address: 'Bandra East', city: 'Mumbai' },
  },
];

const now = Date.now();

const DEMO_ALERTS = [
  // Emergency — Priority 0
  {
    deviceId: 'ESP32-001', deviceName: 'Wearable Alpha',
    level: 3, levelLabel: 'EMERGENCY', priority: 0,
    sensorData: { temperature: 39.5, heartRate: 135, acceleration: 28.2, fallDetected: true },
    triggers: { highTemperature: true, abnormalHeartRate: true, fallDetected: true, sustainedCondition: true },
    message: '[EMERGENCY] | Temp: 39.5°C (High) | HR: 135 BPM (Abnormal) | Fall detected!',
    status: 'QUEUED', queuedAt: new Date(now - 2 * 60000),
  },
  // Critical — Priority 1
  {
    deviceId: 'ESP32-002', deviceName: 'Wearable Beta',
    level: 2, levelLabel: 'CRITICAL', priority: 1,
    sensorData: { temperature: 37.2, heartRate: 88, acceleration: 26.1, fallDetected: true },
    triggers: { highTemperature: false, abnormalHeartRate: false, fallDetected: true, sustainedCondition: false },
    message: '[Critical Event] | Fall! Accel: 26.1 m/s²',
    status: 'QUEUED', queuedAt: new Date(now - 1 * 60000),
  },
  // Mild — Priority 2
  {
    deviceId: 'ESP32-001', deviceName: 'Wearable Alpha',
    level: 1, levelLabel: 'MILD', priority: 2,
    sensorData: { temperature: 38.3, heartRate: 115, acceleration: 9.8, fallDetected: false },
    triggers: { highTemperature: true, abnormalHeartRate: false, fallDetected: false, sustainedCondition: false },
    message: '[Mild Alert] | Temp: 38.3°C (High)',
    status: 'QUEUED', queuedAt: new Date(now - 30000),
  },
  // Resolved example
  {
    deviceId: 'ESP32-001', deviceName: 'Wearable Alpha',
    level: 2, levelLabel: 'CRITICAL', priority: 1,
    sensorData: { temperature: 37.0, heartRate: 95, acceleration: 25.1, fallDetected: true },
    triggers: { fallDetected: true },
    message: '[Critical Event] | Fall detected!',
    status: 'SMS_SENT', queuedAt: new Date(now - 3600000),
    processedAt: new Date(now - 3590000), resolvedAt: new Date(now - 3580000),
    notifications: [{ type: 'SMS', sentTo: '+919876543210', status: 'SENT', sentAt: new Date(now - 3590000) }],
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  await Device.deleteMany({});
  await Alert.deleteMany({});
  console.log('🗑  Cleared existing data');

  await Device.insertMany(DEMO_DEVICES);
  console.log(`✅ Inserted ${DEMO_DEVICES.length} demo devices`);

  await Alert.insertMany(DEMO_ALERTS);
  console.log(`✅ Inserted ${DEMO_ALERTS.length} demo alerts`);

  console.log('\n📋 Queue order (by priority):');
  const queued = await Alert.find({ status: 'QUEUED' }).sort({ priority: 1, queuedAt: 1 });
  queued.forEach((a, i) => {
    console.log(`  ${i+1}. [P${a.priority}] ${a.levelLabel} — ${a.deviceId}`);
  });

  await mongoose.disconnect();
  console.log('\n✅ Seed complete!');
}

seed().catch(e => { console.error(e); process.exit(1); });