// routes/alerts.js — NeDB version
const router = require('express').Router();
const db     = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { resolved = 'false', deviceId, severity } = req.query;
    let query = { resolved: resolved === 'true' };
    if (deviceId) query.device_id = deviceId;
    if (severity) query.severity = severity;

    const alerts = await db.alerts.find(query).sort({ created_at: -1 }).limit(100);
    res.json({ count: alerts.length, alerts });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:deviceId', async (req, res) => {
  try {
    const alerts = await db.alerts.find({ device_id: req.params.deviceId }).sort({ created_at: -1 }).limit(50);
    res.json({ count: alerts.length, alerts });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/resolve', authMiddleware, async (req, res) => {
  try {
    const result = await db.alerts.update(
      { _id: req.params.id },
      { $set: { resolved: true, resolved_at: Date.now() } }
    );
    if (!result) return res.status(404).json({ error: 'Alert tidak ditemukan' });
    res.json({ message: 'Alert berhasil di-resolve' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;