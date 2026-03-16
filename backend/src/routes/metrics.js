// routes/metrics.js — NeDB version
const router = require("express").Router();
const db = require("../config/database");
const ws = require("../services/wsManager");

// POST /api/metrics — Agen kirim data
router.post("/", async (req, res) => {
  try {
    const {
      hostname,
      ip,
      mac,
      username,
      department,
      os,
      cpu_model,
      ram_total,
      gpu,
      cpu,
      ram,
      disk,
      network,
      processes,
      connections,
    } = req.body;

    if (!hostname) return res.status(400).json({ error: "hostname wajib ada" });

    const now = Date.now();

    // Upsert device
    const existing = await db.devices.findOne({ hostname });
    const deviceData = {
      hostname,
      ip,
      mac,
      username,
      department,
      os,
      cpu_model,
      ram_total,
      gpu,
      status: "online",
      last_seen: now,
    };
    if (existing) {
      await db.devices.update({ hostname }, { $set: deviceData });
    } else {
      await db.devices.insert({ ...deviceData, created_at: now });
    }

    const metric = await db.metrics.insert({
      device_id: hostname,
      cpu_percent: cpu?.percent,
      ram_percent: ram?.percent,
      ram_used_gb: ram?.used_gb,
      disk_percent: disk?.percent,
      disk_read: disk?.read_mbps,
      disk_write: disk?.write_mbps,
      net_download: network?.download_mbps,
      net_upload: network?.upload_mbps,
      ping_ms: network?.ping_ms,
      packet_loss: network?.packet_loss,
      disk_partitions: disk?.partitions || [], // ← tambah
      gateway: network?.gateway || "N/A", // ← tambah
      timestamp: now,
    });

    // Replace proses
    if (Array.isArray(processes)) {
      await db.processes.remove({ device_id: hostname }, { multi: true });
      if (processes.length > 0) {
        await db.processes.insert(
          processes
            .slice(0, 30)
            .map((p) => ({ ...p, device_id: hostname, timestamp: now })),
        );
      }
    }

    // Replace koneksi
    if (Array.isArray(connections)) {
      await db.connections.remove({ device_id: hostname }, { multi: true });
      if (connections.length > 0) {
        await db.connections.insert(
          connections
            .slice(0, 50)
            .map((c) => ({ ...c, device_id: hostname, timestamp: now })),
        );
      }
    }

    // Broadcast real-time
    ws.broadcastAll({
      type: "metrics_update",
      deviceId: hostname,
      data: {
        hostname,
        ip,
        username,
        department,
        cpu_percent: cpu?.percent,
        ram_percent: ram?.percent,
        disk_percent: disk?.percent,
        net_download: network?.download_mbps,
        net_upload: network?.upload_mbps,
        ping_ms: network?.ping_ms,
        packet_loss: network?.packet_loss,
        status: "online",
        last_seen: now,
      },
    });

    res.json({ success: true, timestamp: now });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/metrics/:id/latest
router.get("/:id/latest", async (req, res) => {
  try {
    const metrics = await db.metrics
      .find({ device_id: req.params.id })
      .sort({ timestamp: -1 })
      .limit(1);
    if (!metrics.length)
      return res.status(404).json({ error: "Tidak ada data" });

    const processes = await db.processes
      .find({ device_id: req.params.id })
      .sort({ cpu_percent: -1 })
      .limit(20);
    const connections = await db.connections
      .find({ device_id: req.params.id })
      .limit(30);
    res.json({ ...metrics[0], processes, connections });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/metrics/:id?range=1h|6h|24h|7d
router.get("/:id", async (req, res) => {
  try {
    const rangeMap = {
      "1h": 3600000,
      "6h": 21600000,
      "24h": 86400000,
      "7d": 604800000,
    };
    const ms = rangeMap[req.query.range || "1h"] || 3600000;
    const since = Date.now() - ms;

    const metrics = await db.metrics
      .find({ device_id: req.params.id, timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .limit(500);

    res.json({
      deviceId: req.params.id,
      range: req.query.range || "1h",
      count: metrics.length,
      metrics,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
