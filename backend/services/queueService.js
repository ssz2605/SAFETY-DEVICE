/**
 * ═══════════════════════════════════════════════════════════════
 *  PRIORITY QUEUE SERVICE — Alert Scheduling & Sequencing Engine
 * ═══════════════════════════════════════════════════════════════
 *
 *  Scheduling order (like ambulance dispatch):
 *    Level 3 EMERGENCY  → Priority 0 (FIRST — process immediately)
 *    Level 2 CRITICAL   → Priority 1 (SECOND)
 *    Level 1 MILD       → Priority 2 (THIRD)
 *    Level 0 NORMAL     → Priority 3 (LAST — just logged)
 *
 *  Within the same priority level, FIFO (oldest alert first).
 *
 *  The queue is persisted in MongoDB so it survives server restarts.
 */

const Alert = require('../models/Alert');
const smsService = require('./smsService');
const Device = require('../models/Device');

class PriorityQueueService {
  constructor() {
    this.isProcessing = false;
    this.intervalId   = null;
    this.io           = null;   // Socket.IO reference injected later
  }

  // ── Inject Socket.IO for real-time updates ───────────────────
  setSocketIO(io) {
    this.io = io;
  }

  // ── Start the background queue processor ────────────────────
  start(intervalMs = 2000) {
    if (this.intervalId) return;
    console.log(`🔄 Priority Queue started — polling every ${intervalMs}ms`);
    this.intervalId = setInterval(() => this.processNext(), intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹  Priority Queue stopped');
    }
  }

  // ── Add a new alert to the queue ────────────────────────────
  async enqueue(alertData) {
    try {
      const alert = new Alert(alertData);
      await alert.save();

      console.log(`📥 Queued: [Level ${alert.level}] ${alert.levelLabel} | Device: ${alert.deviceId} | Priority: ${alert.priority}`);

      // Emit real-time event to dashboard
      if (this.io) {
        this.io.emit('alert:new', alert);
        this.io.emit('queue:update', await this.getQueueStats());
      }

      // For EMERGENCY (Level 3), trigger immediate processing
      if (alert.level === 3) {
        console.log('🚨 EMERGENCY detected — triggering immediate processing!');
        setImmediate(() => this.processNext());
      }

      return alert;
    } catch (err) {
      console.error('❌ Enqueue error:', err.message);
      throw err;
    }
  }

  // ── Process the highest-priority pending alert ───────────────
  async processNext() {
    if (this.isProcessing) return;  // Prevent concurrent processing

    this.isProcessing = true;
    try {
      // Fetch the top of the queue:
      // Sort by priority ASC (0 = emergency first), then queuedAt ASC (FIFO within same level)
      const alert = await Alert.findOneAndUpdate(
        { status: 'QUEUED' },
        { status: 'PROCESSING', processedAt: new Date() },
        {
          new: true,
          sort: { priority: 1, queuedAt: 1 },  // ← THE SCHEDULING LOGIC
        }
      );

      if (!alert) {
        this.isProcessing = false;
        return;  // Queue is empty
      }

      console.log(`⚙️  Processing: [${alert.levelLabel}] Device ${alert.deviceId}`);

      // Handle based on level
      if (alert.level === 0) {
        // Normal — just mark resolved, no SMS
        await Alert.findByIdAndUpdate(alert._id, {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolvedBy: 'system:auto',
        });
        console.log(`✅ Normal reading resolved (no action needed)`);

      } else {
        // Level 1, 2, 3 — send SMS and notify
        await this.handleAlert(alert);
      }

      // Emit updated queue stats
      if (this.io) {
        this.io.emit('queue:update', await this.getQueueStats());
        this.io.emit('alert:updated', await Alert.findById(alert._id));
      }

    } catch (err) {
      console.error('❌ Queue processing error:', err.message);
    } finally {
      this.isProcessing = false;
    }
  }

  // ── Handle an active alert (send SMS, notify) ───────────────
  async handleAlert(alert) {
    try {
      // Look up device and emergency contacts
      const device = await Device.findOne({ deviceId: alert.deviceId });

      if (!device || !device.emergencyContacts?.length) {
        console.warn(`⚠️  No emergency contacts for device ${alert.deviceId}`);
        await Alert.findByIdAndUpdate(alert._id, {
          status: 'FAILED',
          resolvedAt: new Date(),
        });
        return;
      }

      // Sort contacts by priority
      const contacts = device.emergencyContacts
        .filter(c => c.active)
        .sort((a, b) => a.priority - b.priority);

      const notifications = [];

      for (const contact of contacts) {
        try {
          const smsResult = await smsService.sendAlert({
            to:          contact.phone,
            patientName: device.patientName,
            level:       alert.level,
            levelLabel:  alert.levelLabel,
            message:     alert.message,
            sensorData:  alert.sensorData,
            deviceName:  device.deviceName,
          });

          notifications.push({
            type:   'SMS',
            sentTo: contact.phone,
            sentAt: new Date(),
            status: smsResult.success ? 'SENT' : 'FAILED',
            errorMsg: smsResult.error || undefined,
          });

          if (smsResult.success) {
            console.log(`📱 SMS sent to ${contact.name} (${contact.phone})`);
          }
        } catch (smsErr) {
          notifications.push({
            type: 'SMS', sentTo: contact.phone,
            sentAt: new Date(), status: 'FAILED', errorMsg: smsErr.message,
          });
        }

        // For Level 1 (Mild) — only notify first contact
        // For Level 2+ — notify all active contacts
        if (alert.level < 2) break;
      }

      const allSent = notifications.some(n => n.status === 'SENT');
      await Alert.findByIdAndUpdate(alert._id, {
        status:        allSent ? 'SMS_SENT' : 'FAILED',
        smsSentAt:     allSent ? new Date() : undefined,
        resolvedAt:    new Date(),
        notifications: notifications,
      });

      if (device) {
        await Device.findByIdAndUpdate(device._id, { lastAlertAt: new Date() });
      }

    } catch (err) {
      console.error(`❌ handleAlert error: ${err.message}`);
      await Alert.findByIdAndUpdate(alert._id, { status: 'FAILED' });
    }
  }

  // ── Queue statistics ─────────────────────────────────────────
  async getQueueStats() {
    const [queued, processing, byCriticality] = await Promise.all([
      Alert.countDocuments({ status: 'QUEUED' }),
      Alert.countDocuments({ status: 'PROCESSING' }),
      Alert.aggregate([
        { $match: { status: { $in: ['QUEUED', 'PROCESSING'] } } },
        { $group: { _id: '$levelLabel', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      totalQueued:   queued,
      processing:    processing,
      byCriticality: byCriticality.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      timestamp: new Date(),
    };
  }

  // ── Get current queue (sorted by priority) ──────────────────
  async getQueue(limit = 50) {
    return Alert.find({ status: { $in: ['QUEUED', 'PROCESSING'] } })
      .sort({ priority: 1, queuedAt: 1 })
      .limit(limit)
      .lean();
  }
}

module.exports = new PriorityQueueService();  // Singleton