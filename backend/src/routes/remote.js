const router     = require('express').Router();
const { spawn }  = require('child_process');
const db         = require('../config/database');

const activeSessions = new Map();

function getAvailablePort() {
  const usedPorts = new Set([...activeSessions.values()].map(s => s.wsPort));
  let port = 6100;
  while (usedPorts.has(port)) port++;
  return port;
}

router.post('/start/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const vncPort = req.body.vncPort || 5900;

    const device = await db.devices.findOne({ hostname: deviceId });
    if (!device) return res.status(404).json({ error: 'Device tidak ditemukan' });
    if (!device.ip) return res.status(400).json({ error: 'IP device tidak diketahui' });

    if (activeSessions.has(deviceId)) {
      const existing = activeSessions.get(deviceId);
      console.log(`♻️  Reuse sesi remote: ${deviceId} → port ${existing.wsPort}`);
      return res.json({
        success:  true,
        wsPort:   existing.wsPort,
        deviceId: deviceId,
        ip:       device.ip,
        reused:   true,
      });
    }

    const wsPort = getAvailablePort();

    console.log(`🖥️  Start remote: ${deviceId} (${device.ip}:${vncPort}) → ws port ${wsPort}`);

    const proc = spawn('websockify', [
      '--web', './novnc',        
      `0.0.0.0:${wsPort}`,        
      `${device.ip}:${vncPort}`, 
    ], {
      detached: false,
      stdio: 'pipe',
    });

    proc.stdout.on('data', (data) => {
      console.log(`[websockify:${deviceId}] ${data.toString().trim()}`);
    });

    proc.stderr.on('data', (data) => {
      console.error(`[websockify:${deviceId}] ${data.toString().trim()}`);
    });

    proc.on('error', (err) => {
      console.error(`websockify error [${deviceId}]:`, err.message);
      activeSessions.delete(deviceId);
    });

    proc.on('close', (code) => {
      console.log(`websockify closed [${deviceId}] code: ${code}`);
      activeSessions.delete(deviceId);
    });

    activeSessions.set(deviceId, {
      proc,
      wsPort,
      ip:        device.ip,
      startedAt: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    res.json({
      success:  true,
      wsPort,
      deviceId,
      ip:       device.ip,
      reused:   false,
    });

  } catch (e) {
    console.error('Remote start error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/remote/stop/:deviceId ─────────────────────────
router.post('/stop/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  if (activeSessions.has(deviceId)) {
    const session = activeSessions.get(deviceId);
    session.proc.kill('SIGTERM');
    activeSessions.delete(deviceId);
    console.log(`🛑 Stop remote: ${deviceId}`);
  }
  res.json({ success: true });
});

// ── GET /api/remote/sessions ─────────────────────────────────
// Lihat semua sesi aktif (untuk debugging)
router.get('/sessions', (req, res) => {
  const sessions = [...activeSessions.entries()].map(([deviceId, s]) => ({
    deviceId,
    wsPort:    s.wsPort,
    ip:        s.ip,
    startedAt: s.startedAt,
    duration:  Math.floor((Date.now() - s.startedAt) / 1000) + 's',
  }));
  res.json({ count: sessions.length, sessions });
});

// Cleanup semua sesi saat server shutdown
process.on('SIGTERM', () => {
  activeSessions.forEach((s) => s.proc.kill());
  activeSessions.clear();
});
process.on('SIGINT', () => {
  activeSessions.forEach((s) => s.proc.kill());
  activeSessions.clear();
});

module.exports = router;