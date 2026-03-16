const db  = require('../config/database');
const ws  = require('./wsManager');

const THRESHOLDS = {
  cpu:         { warning: 75, critical: 90 },
  ram:         { warning: 80, critical: 92 },
  disk:        { warning: 80, critical: 95 },
  ping:        { warning: 100, critical: 500 },
  packet_loss: { warning: 1,  critical: 5 },
  offline_ms:  60000,
};

async function run() {
  try {
    const now     = Date.now();
    const devices = await db.devices.find({ status: { $ne: 'offline' } });

    for (const device of devices) {
      const metrics = await db.metrics.find({ device_id: device.hostname }).sort({ timestamp: -1 }).limit(1);
      if (!metrics.length) continue;
      const m = metrics[0];

      if (now - m.timestamp > 120000) continue; // data lama, skip

      await checkMetric(device.hostname, 'cpu',         m.cpu_percent,  THRESHOLDS.cpu,         'CPU usage tinggi');
      await checkMetric(device.hostname, 'ram',         m.ram_percent,  THRESHOLDS.ram,         'RAM usage tinggi');
      await checkMetric(device.hostname, 'disk',        m.disk_percent, THRESHOLDS.disk,        'Disk hampir penuh');
      await checkMetric(device.hostname, 'ping',        m.ping_ms,      THRESHOLDS.ping,        'Latensi jaringan tinggi');
      await checkMetric(device.hostname, 'packet_loss', m.packet_loss,  THRESHOLDS.packet_loss, 'Packet loss terdeteksi');
    }

    // Cek offline
    const maybeOffline = await db.devices.find({ status: { $ne: 'offline' } });
    for (const d of maybeOffline) {
      if (now - (d.last_seen || 0) > THRESHOLDS.offline_ms) {
        await db.devices.update({ hostname: d.hostname }, { $set: { status: 'offline' } });
        const existing = await db.alerts.findOne({ device_id: d.hostname, type: 'offline', resolved: false });
        if (!existing) {
          await db.alerts.insert({ device_id: d.hostname, type: 'offline', severity: 'critical',
            message: 'PC tidak merespons / offline', resolved: false, created_at: now });
          await db.logs.insert({ device_id: d.hostname, level: 'error', category: 'system',
            message: 'PC terdeteksi offline', timestamp: now });
        }
        ws.broadcastAll({ type: 'device_offline', deviceId: d.hostname, hostname: d.hostname });
      }
    }

    // Update status device
    const activeAlerts = await db.alerts.find({ resolved: false });
    const bySeverity = {};
    for (const a of activeAlerts) {
      if (!bySeverity[a.device_id] || a.severity === 'critical') bySeverity[a.device_id] = a.severity;
    }
    for (const [deviceId, severity] of Object.entries(bySeverity)) {
      await db.devices.update({ hostname: deviceId }, { $set: { status: severity === 'critical' ? 'critical' : 'warning' } });
    }
  } catch (e) {
    console.error('Alert Engine error:', e.message);
  }
}

async function checkMetric(deviceId, type, value, config, baseMsg) {
  if (value == null) return;

  let severity = null;
  let threshold = null;
  if (value >= config.critical) { severity = 'critical'; threshold = config.critical; }
  else if (value >= config.warning) { severity = 'warning'; threshold = config.warning; }

  if (!severity) {
    // Resolve
    const updated = await db.alerts.update(
      { device_id: deviceId, type, resolved: false },
      { $set: { resolved: true, resolved_at: Date.now() } },
      { multi: true }
    );
    if (updated > 0) ws.broadcastToDevice(deviceId, { type: 'alert_resolved', alertType: type, deviceId });
    return;
  }

  const existing = await db.alerts.findOne({ device_id: deviceId, type, resolved: false });
  if (existing) return;

  const alert = await db.alerts.insert({
    device_id: deviceId, type, severity,
    message: `${baseMsg}: ${value.toFixed(1)} (threshold: ${threshold})`,
    value, threshold, resolved: false, created_at: Date.now(),
  });

  await db.logs.insert({
    device_id: deviceId,
    level: severity === 'critical' ? 'error' : 'warning',
    category: 'alert',
    message: `[${severity.toUpperCase()}] ${baseMsg}: ${value.toFixed(1)}`,
    timestamp: Date.now(),
  });

  ws.broadcastToDevice(deviceId, {
    type: 'new_alert', alertType: type, severity, value, threshold,
    message: `${baseMsg}: ${value.toFixed(1)}`, time: new Date().toISOString(),
  });
  console.log(`🚨 Alert [${severity}] ${deviceId}: ${type} = ${value}`);
}

module.exports = { run, THRESHOLDS };