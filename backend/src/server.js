const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const db = require('./config/database');
const wsManager = require('./services/wsManager');
const alertEngine = require('./services/alertEngine');

// Routes
const metricsRoute = require('./routes/metrics');
const devicesRoute = require('./routes/devices');
const alertsRoute = require('./routes/alerts');
const logsRoute = require('./routes/logs');
const authRoute = require('./routes/auth');

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});


const wss = new WebSocket.Server({ server, path: '/ws' });
wsManager.init(wss);

setInterval(() => alertEngine.run(), 30_000);

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`\n🚀 NetWatch Backend running on port ${PORT}`);
  console.log(`   REST API  : http://localhost:${PORT}/api`);
  console.log(`   WebSocket : ws://localhost:${PORT}/ws`);
  console.log(`   Health    : http://localhost:${PORT}/health\n`);
});

module.exports = { app, server };