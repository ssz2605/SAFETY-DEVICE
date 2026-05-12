/**
 * ═══════════════════════════════════════════════
 *  ALERT CLASSIFIER SERVICE
 *  Classifies sensor data into alert levels
 *  Based on logic from PPT slides 3–6
 * ═══════════════════════════════════════════════
 *
 *  Input:  { temperature, heartRate, acceleration, fallDetected, durationMinutes }
 *  Output: { level, triggers, message }
 */

const DEFAULT_THRESHOLDS = {
  tempHigh:         38.0,    // °C
  heartRateHigh:    120,     // BPM
  heartRateLow:     50,      // BPM
  accelerationFall: 24.5,    // m/s² (≈ 2.5g)
  sustainedMinutes: 5,       // minutes
  mildMinutes:      2,       // minutes for Level 1
};

function classifyAlert(sensorData, customThresholds = {}) {
  const T = { ...DEFAULT_THRESHOLDS, ...customThresholds };

  const {
    temperature   = 0,
    heartRate     = 0,
    acceleration  = 0,
    fallDetected  = false,
    durationMinutes = 0,
  } = sensorData;

  const triggers = {
    highTemperature:    temperature >= T.tempHigh,
    abnormalHeartRate:  heartRate > T.heartRateHigh || (heartRate < T.heartRateLow && heartRate > 0),
    fallDetected:       fallDetected || acceleration >= T.accelerationFall,
    sustainedCondition: durationMinutes >= T.sustainedMinutes,
  };

  const activeCount = Object.values(triggers).filter(Boolean).length;

  let level = 0;

  // ─── Level 3: EMERGENCY ─────────────────────────────
  // Two or more conditions, OR any critical condition lasting >5 min
  if (
    (triggers.fallDetected && triggers.sustainedCondition) ||
    activeCount >= 3 ||
    (activeCount >= 2 && triggers.fallDetected)
  ) {
    level = 3;
  }

  // ─── Level 2: CRITICAL EVENT ────────────────────────
  // Fall detected with significant impact
  else if (triggers.fallDetected) {
    level = 2;
  }

  // ─── Level 1: MILD ALERT ────────────────────────────
  // High temp OR abnormal HR sustained for >2 min
  else if (
    (triggers.highTemperature || triggers.abnormalHeartRate) &&
    durationMinutes >= T.mildMinutes
  ) {
    level = 1;
  }

  // ─── Level 0: NORMAL ─────────────────────────────────
  else {
    level = 0;
  }

  const labels  = { 0: 'NORMAL', 1: 'MILD', 2: 'CRITICAL', 3: 'EMERGENCY' };
  const message = buildMessage(level, triggers, sensorData);

  return {
    level,
    levelLabel: labels[level],
    triggers,
    message,
  };
}

function buildMessage(level, triggers, sensorData) {
  const levelNames = { 0: 'Normal', 1: 'Mild Alert', 2: 'Critical Event', 3: 'EMERGENCY' };
  const parts = [`[${levelNames[level]}]`];
  if (triggers.highTemperature)    parts.push(`Temp: ${sensorData.temperature}°C (High)`);
  if (triggers.abnormalHeartRate)  parts.push(`HR: ${sensorData.heartRate} BPM (Abnormal)`);
  if (triggers.fallDetected)       parts.push(`Fall! Accel: ${sensorData.acceleration?.toFixed(1)} m/s²`);
  if (triggers.sustainedCondition) parts.push(`Condition sustained >5min`);
  if (level === 0)                 parts.push(`All vitals normal`);
  return parts.join(' | ');
}

module.exports = { classifyAlert, buildMessage, DEFAULT_THRESHOLDS };