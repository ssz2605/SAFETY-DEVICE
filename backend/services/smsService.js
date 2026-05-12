/**
 * ════════════════════════════════
 *  TWILIO SMS SERVICE
 *  Sends emergency alerts via SMS
 *  (as described in the PPT slide 12)
 * ════════════════════════════════
 */

const twilio = require('twilio');

const LEVEL_EMOJI = {
  1: '⚠️',
  2: '🔴',
  3: '🚨',
};

class SMSService {
  constructor() {
    this.client = null;
    this.fromNumber = process.env.TWILIO_FROM_NUMBER;

    // Cooldown tracking: prevent SMS spam per device
    // Format: { "deviceId_level": timestamp }
    this.lastSentMap = new Map();
    this.cooldownMs  = (parseInt(process.env.SMS_COOLDOWN_MINUTES) || 5) * 60 * 1000;

    this._init();
  }

  _init() {
    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;

    if (sid && token && sid.startsWith('AC')) {
      this.client = twilio(sid, token);
      console.log('✅ Twilio SMS service initialized');
    } else {
      console.warn('⚠️  Twilio credentials not configured — SMS in MOCK mode');
    }
  }

  // ── Build SMS body (matches PPT SMS format) ──────────────────
  _buildMessage({ patientName, level, levelLabel, sensorData, deviceName }) {
    const emoji = LEVEL_EMOJI[level] || '⚠️';
    const lines = [
      `${emoji} CPPS ALERT - ${levelLabel}`,
      `Patient: ${patientName}`,
      `Device: ${deviceName}`,
      `─────────────────`,
    ];

    if (sensorData) {
      if (sensorData.temperature)  lines.push(`Temp: ${sensorData.temperature}°C`);
      if (sensorData.heartRate)    lines.push(`HR: ${sensorData.heartRate} BPM`);
      if (sensorData.fallDetected) lines.push(`⚠️ FALL DETECTED`);
      if (sensorData.acceleration) lines.push(`Impact: ${sensorData.acceleration.toFixed(1)} m/s²`);
    }

    lines.push(`─────────────────`);
    lines.push(`Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    lines.push(`Reply RESOLVE to acknowledge`);

    return lines.join('\n');
  }

  // ── Check cooldown ────────────────────────────────────────────
  _isOnCooldown(deviceId, level) {
    // Emergency (Level 3) always sends — no cooldown
    if (level === 3) return false;

    const key     = `${deviceId}_${level}`;
    const lastSent = this.lastSentMap.get(key);
    if (!lastSent) return false;
    return (Date.now() - lastSent) < this.cooldownMs;
  }

  _setCooldown(deviceId, level) {
    const key = `${deviceId}_${level}`;
    this.lastSentMap.set(key, Date.now());
  }

  // ── Send alert SMS ────────────────────────────────────────────
  async sendAlert({ to, patientName, level, levelLabel, sensorData, deviceName, deviceId }) {
    if (this._isOnCooldown(deviceId, level)) {
      console.log(`⏳ SMS cooldown active for device ${deviceId} level ${level} — skipped`);
      return { success: false, error: 'COOLDOWN_ACTIVE' };
    }

    const body = this._buildMessage({ patientName, level, levelLabel, sensorData, deviceName });

    // MOCK mode (no Twilio credentials)
    if (!this.client) {
      console.log('\n📱 [MOCK SMS]─────────────────────────────');
      console.log(`To: ${to}`);
      console.log(body);
      console.log('──────────────────────────────────────────\n');
      this._setCooldown(deviceId, level);
      return { success: true, mock: true, to, body };
    }

    // Real Twilio send
    try {
      const message = await this.client.messages.create({
        body:  body,
        from:  this.fromNumber,
        to:    to,
      });

      this._setCooldown(deviceId, level);
      console.log(`✅ SMS sent | SID: ${message.sid} | To: ${to}`);

      return { success: true, sid: message.sid, to, body };
    } catch (err) {
      console.error(`❌ Twilio SMS error: ${err.message}`);
      return { success: false, error: err.message, to };
    }
  }
}

module.exports = new SMSService();