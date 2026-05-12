const router = require('express').Router();
const Device = require('../models/Device');
const Alert  = require('../models/Alert');

// GET /api/devices
router.get('/', async (req, res) => {
  try {
    const devices = await Device.find().sort({ updatedAt: -1 }).lean();
    return res.json({ success: true, data: devices });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/devices/register — register a new ESP32 device
router.post('/register', async (req, res) => {
  try {
    const { deviceId, deviceName, patientName, patientAge, condition,
            emergencyContacts, location, macAddress } = req.body;

    if (!deviceId || !deviceName || !patientName) {
      return res.status(400).json({ success: false, error: 'deviceId, deviceName, patientName required' });
    }

    const existing = await Device.findOne({ deviceId });
    if (existing) {
      // Update existing
      const updated = await Device.findOneAndUpdate({ deviceId }, {
        deviceName, patientName, patientAge, condition,
        emergencyContacts, location, macAddress,
      }, { new: true });
      return res.json({ success: true, data: updated, updated: true });
    }

    const device = await Device.create({
      deviceId, deviceName, patientName, patientAge, condition,
      emergencyContacts: emergencyContacts || [],
      location, macAddress,
    });

    return res.status(201).json({ success: true, data: device });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/devices/:deviceId
router.get('/:deviceId', async (req, res) => {
  try {
    const device = await Device.findOne({ deviceId: req.params.deviceId }).lean();
    if (!device) return res.status(404).json({ success: false, error: 'Device not found' });

    // Include recent alerts
    const recentAlerts = await Alert.find({ deviceId: req.params.deviceId })
      .sort({ createdAt: -1 }).limit(10).lean();

    return res.json({ success: true, data: { ...device, recentAlerts } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/devices/:deviceId/thresholds — update alert thresholds
router.patch('/:deviceId/thresholds', async (req, res) => {
  try {
    const device = await Device.findOneAndUpdate(
      { deviceId: req.params.deviceId },
      { thresholds: req.body },
      { new: true }
    );
    if (!device) return res.status(404).json({ success: false, error: 'Device not found' });
    return res.json({ success: true, data: device });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/devices/:deviceId/contacts — add emergency contact
router.post('/:deviceId/contacts', async (req, res) => {
  try {
    const device = await Device.findOneAndUpdate(
      { deviceId: req.params.deviceId },
      { $push: { emergencyContacts: req.body } },
      { new: true }
    );
    if (!device) return res.status(404).json({ success: false, error: 'Device not found' });
    return res.json({ success: true, data: device });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;