const router = require('express').Router();
const Alert  = require('../models/Alert');
const Device = require('../models/Device');
const queue  = require('../services/queueService');

// GET /api/stats — dashboard statistics
router.get('/', async (req, res) => {
  try {
    const [
      totalAlerts,
      alertsByLevel,
      alertsByStatus,
      totalDevices,
      activeDevices,
      recentAlerts,
      queueStats,
    ] = await Promise.all([
      Alert.countDocuments(),
      Alert.aggregate([
        { $group: { _id: '$levelLabel', count: { $sum: 1 } } }
      ]),
      Alert.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Device.countDocuments(),
      Device.countDocuments({ isActive: true }),
      Alert.find({ level: { $gte: 1 } })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      queue.getQueueStats(),
    ]);

    return res.json({
      success: true,
      data: {
        alerts: {
          total:    totalAlerts,
          byLevel:  alertsByLevel.reduce((a, i) => ({ ...a, [i._id]: i.count }), {}),
          byStatus: alertsByStatus.reduce((a, i) => ({ ...a, [i._id]: i.count }), {}),
        },
        devices: { total: totalDevices, active: activeDevices },
        queue:   queueStats,
        recentAlerts,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/health
router.get('/health', (_req, res) => {
  res.json({ status: 'OK', uptime: process.uptime(), timestamp: new Date() });
});

module.exports = router;
