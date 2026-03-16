const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const schedule = require('node-cron');

const db = require('./config/database');
const wsManager = require('./services/wsManager');
const alertEngine = require('./services/alertEngine');

// Routes
const metricsRoute = require('./routes/metrics');
const devicesRoute = require('./routes/devices');
const alertsRoute = require('./routes/alerts');
const logsRoute = require('./routes/logs');
const authRoute = require('./routes/auth');
const remoteRoute = require('./routes/remote');

const app = express();
const server = http.createServer(app);

// ── Middleware ──────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('dev'));

// ── REST API Routes ─────────────────────────────────────────
app.use('/api/auth',    authRoute);
app.use('/api/metrics', metricsRoute);
app.use('/api/devices', devicesRoute);
app.use('/api/alerts',  alertsRoute);
app.use('/api/logs',    logsRoute);
app.use('/api/remote', remoteRoute);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});


const wss = new WebSocket.Server({ server, path: '/ws' });
wsManager.init(wss);

setInterval(() => alertEngine.run(), 30_000);

// ── Auto Cleanup Database ────────────────────────────────────
// Jalankan setiap hari jam 00:00 (tengah malam)

require('node-cron').schedule('0 0 * * *', async () => {
  const db = require('./config/database');
  const now = Date.now();

  // Hapus metrik lebih dari 7 hari
  const days7 = now - (7 * 24 * 60 * 60 * 1000);
  const m = await db.metrics.remove({ timestamp: { $lt: days7 } }, { multi: true });

  // Hapus proses & koneksi lebih dari 1 hari
  const days1 = now - (24 * 60 * 60 * 1000);
  const p = await db.processes.remove({ timestamp: { $lt: days1 } }, { multi: true });
  const c = await db.connections.remove({ timestamp: { $lt: days1 } }, { multi: true });

  // Hapus logs lebih dari 30 hari
  const days30 = now - (30 * 24 * 60 * 60 * 1000);
  const l = await db.logs.remove({ timestamp: { $lt: days30 } }, { multi: true });

  // Hapus alert resolved lebih dari 30 hari
  const a = await db.alerts.remove({ resolved: true, created_at: { $lt: days30 } }, { multi: true });

  console.log(`🧹 Cleanup: ${m} metrik, ${p} proses, ${c} koneksi, ${l} log, ${a} alert dihapus`);
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`\n🚀 NetWatch Backend running on port ${PORT}`);
  console.log(`   REST API  : http://localhost:${PORT}/api`);
  console.log(`   WebSocket : ws://localhost:${PORT}/ws`);
  console.log(`   Health    : http://localhost:${PORT}/health\n`);
});

module.exports = { app, server };