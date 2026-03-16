// routes/logs.js — NeDB version
const router = require('express').Router();
const db     = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const { deviceId, level, category, limit = 100 } = req.query;
    let query = {};
    if (deviceId) query.device_id = deviceId;
    if (level)    query.level = level;
    if (category) query.category = category;

    const logs = await db.logs.find(query).sort({ timestamp: -1 }).limit(parseInt(limit));
    res.json({ count: logs.length, logs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:deviceId', async (req, res) => {
  try {
    const logs = await db.logs.find({ device_id: req.params.deviceId }).sort({ timestamp: -1 }).limit(100);
    res.json({ count: logs.length, logs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;