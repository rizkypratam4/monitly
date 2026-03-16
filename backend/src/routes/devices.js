// routes/devices.js — NeDB version
const router = require('express').Router();
const db     = require('../config/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/devices/summary — harus sebelum /:id
router.get('/summary', async (req, res) => {
  try {
    const now = Date.now();
    const all      = await db.devices.find({});
    const online   = all.filter(d => d.status === 'online').length;
    const warning  = all.filter(d => d.status === 'warning').length;
    const offline  = all.filter(d => d.status === 'offline').length;
    const alerts   = await db.alerts.find({ resolved: false });

    // Avg CPU dari metrik terbaru tiap device (2 menit terakhir)
    let totalCpu = 0, totalDl = 0, count = 0;
    for (const d of all) {
      const m = await db.metrics.find({ device_id: d.hostname, timestamp: { $gte: now - 120000 } })
                                .sort({ timestamp: -1 }).limit(1);
      if (m.length) { totalCpu += m[0].cpu_percent || 0; totalDl += m[0].net_download || 0; count++; }
    }

    res.json({
      total: all.length, online, warning, offline,
      activeAlerts: alerts.length,
      avgCpu: count ? Math.round(totalCpu / count) : 0,
      totalDownload: count ? Math.round(totalDl * all.length / 1000 * 10) / 10 : 0,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/devices
router.get('/', async (req, res) => {
  try {
    const { status, search, department } = req.query;
    let query = {};
    if (status && status !== 'all') query.status = status;
    if (department) query.department = department;

    let devices = await db.devices.find(query).sort({ status: 1, hostname: 1 });

    if (search) {
      const s = search.toLowerCase();
      devices = devices.filter(d =>
        (d.hostname || '').toLowerCase().includes(s) ||
        (d.ip || '').includes(s) ||
        (d.username || '').toLowerCase().includes(s)
      );
    }

    // Attach latest metric dan alert count
    const now = Date.now();
    const result = await Promise.all(devices.map(async d => {
      const metrics = await db.metrics.find({ device_id: d.hostname }).sort({ timestamp: -1 }).limit(1);
      const alertCount = (await db.alerts.find({ device_id: d.hostname, resolved: false })).length;
      return { ...d, ...(metrics[0] || {}), alert_count: alertCount };
    }));

    res.json({ count: result.length, devices: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/devices/:id
router.get('/:id', async (req, res) => {
  try {
    const device = await db.devices.findOne({ hostname: req.params.id });
    if (!device) return res.status(404).json({ error: 'Device tidak ditemukan' });

    const latestMetric = (await db.metrics.find({ device_id: req.params.id }).sort({ timestamp: -1 }).limit(1))[0];
    const processes    = await db.processes.find({ device_id: req.params.id }).sort({ cpu_percent: -1 }).limit(20);
    const connections  = await db.connections.find({ device_id: req.params.id }).limit(30);
    const alerts       = await db.alerts.find({ device_id: req.params.id, resolved: false }).sort({ created_at: -1 });

    res.json({ device, latestMetric, processes, connections, alerts });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/devices/:id
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const device = await db.devices.findOne({ hostname: req.params.id });
    if (!device) return res.status(404).json({ error: 'Device tidak ditemukan' });

    await db.devices.remove({ hostname: req.params.id }, {});
    await db.metrics.remove({ device_id: req.params.id }, { multi: true });
    await db.processes.remove({ device_id: req.params.id }, { multi: true });
    await db.connections.remove({ device_id: req.params.id }, { multi: true });
    await db.alerts.remove({ device_id: req.params.id }, { multi: true });
    await db.logs.remove({ device_id: req.params.id }, { multi: true });

    res.json({ message: `Device ${req.params.id} berhasil dihapus` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;