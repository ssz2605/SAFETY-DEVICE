/**
 * ═══════════════════════
 *  ALERTS ROUTER
 *  POST /api/alerts        ← ESP32 sends sensor data here
 *  GET  /api/alerts        ← Dashboard fetches all alerts
 *  GET  /api/alerts/queue  ← Current queue state
 *  POST /api/alerts/:id/resolve
 * ═══════════════════════
 */

const router   = require('express').Router();
const Joi      = require('joi');
const Alert    = require('../models/Alert');
const Device   = require('../models/Device');
const queue    = require('../services/queueService');
const { classifyAlert } = require('../services/classifierService');

// ── Input validation schema ──────────────────────────────────
const sensorSchema = Joi.object({
  deviceId:        Joi.string().required(),
  temperature:     Joi.number().min(-50).max(100).required(),
  heartRate:       Joi.number().min(0).max(300).required(),
  acceleration:    Joi.number().min(0).default(0),
  fallDetected:    Joi.boolean().default(false),
  durationMinutes: Joi.number().min(0).default(0),
  // Optional: allow device to send its own classification (will be re-verified)
  level:           Joi.number().integer().min(0).max(3).optional(),
});

// ─────────────────────────────────────────────────────────────
//  POST /api/alerts
//  ESP32 calls this endpoint when sensor data is ready
//  Backend re-classifies and enqueues with proper priority
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { error, value } = sensorSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const { deviceId, temperature, heartRate, acceleration, fallDetected, durationMinutes } = value;

    // Find device (or auto-create minimal device record)
    let device = await Device.findOne({ deviceId });
    if (!device) {
      device = await Device.create({
        deviceId,
        deviceName:  `Device-${deviceId.slice(-4)}`,
        patientName: 'Unknown Patient',
        emergencyContacts: [],
      });
      console.log(`📱 Auto-registered new device: ${deviceId}`);
    }

    // Update last seen
    await Device.findByIdAndUpdate(device._id, { lastSeen: new Date() });

    // Classify using backend logic (uses device's custom thresholds if set)
    const classification = classifyAlert(
      { temperature, heartRate, acceleration, fallDetected, durationMinutes },
      device.thresholds
    );

    // Build and enqueue alert
    const alert = await queue.enqueue({
      deviceId,
      deviceName:  device.deviceName,
      level:       classification.level,
      levelLabel:  classification.levelLabel,
      priority:    classification.level === 3 ? 0 :
                   classification.level === 2 ? 1 :
                   classification.level === 1 ? 2 : 3,
      sensorData:  { temperature, heartRate, acceleration, fallDetected },
      triggers:    classification.triggers,
      message:     classification.message,
    });

    return res.status(201).json({
      success:        true,
      alertId:        alert._id,
      level:          classification.level,
      levelLabel:     classification.levelLabel,
      priority:       alert.priority,
      message:        classification.message,
      actionRequired: classification.level > 0,
    });

  } catch (err) {
    console.error('POST /api/alerts error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /api/alerts  — paginated list
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page) || 1);
    const limit    = Math.min(100, parseInt(req.query.limit) || 20);
    const skip     = (page - 1) * limit;
    const deviceId = req.query.deviceId;
    const level    = req.query.level;
    const status   = req.query.status;

    const filter = {};
    if (deviceId) filter.deviceId = deviceId;
    if (level    !== undefined) filter.level = parseInt(level);
    if (status)  filter.status = status;

    const [alerts, total] = await Promise.all([
      Alert.find(filter)
        .sort({ priority: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Alert.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data:    alerts,
      pagination: {
        page, limit, total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /api/alerts/queue  — view current processing queue
// ─────────────────────────────────────────────────────────────
router.get('/queue', async (req, res) => {
  try {
    const [items, stats] = await Promise.all([
      queue.getQueue(),
      queue.getQueueStats(),
    ]);
    return res.json({ success: true, queue: items, stats });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /api/alerts/:id
// ─────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id).lean();
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    return res.json({ success: true, data: alert });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/alerts/:id/resolve  — mark alert as resolved
// ─────────────────────────────────────────────────────────────
router.post('/:id/resolve', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      {
        status:     'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: req.body.resolvedBy || 'dashboard-user',
      },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    return res.json({ success: true, data: alert });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;