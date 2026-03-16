// ============================================================
// config/database.js — NeDB embedded database
// File-based, zero native compilation, siap pakai
// ============================================================
const Datastore = require('nedb-promises').default || require('nedb-promises');
const bcrypt    = require('bcryptjs');
const path      = require('path');
const fs        = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = {
  devices:     Datastore.create({ filename: path.join(DATA_DIR, 'devices.db'),     autoload: true }),
  metrics:     Datastore.create({ filename: path.join(DATA_DIR, 'metrics.db'),     autoload: true }),
  processes:   Datastore.create({ filename: path.join(DATA_DIR, 'processes.db'),   autoload: true }),
  connections: Datastore.create({ filename: path.join(DATA_DIR, 'connections.db'), autoload: true }),
  alerts:      Datastore.create({ filename: path.join(DATA_DIR, 'alerts.db'),      autoload: true }),
  logs:        Datastore.create({ filename: path.join(DATA_DIR, 'logs.db'),        autoload: true }),
  users:       Datastore.create({ filename: path.join(DATA_DIR, 'users.db'),       autoload: true }),
};

// Index untuk performa
db.metrics.ensureIndex({ fieldName: 'device_id' });
db.metrics.ensureIndex({ fieldName: 'timestamp' });
db.processes.ensureIndex({ fieldName: 'device_id' });
db.connections.ensureIndex({ fieldName: 'device_id' });
db.alerts.ensureIndex({ fieldName: 'device_id' });
db.alerts.ensureIndex({ fieldName: 'resolved' });
db.logs.ensureIndex({ fieldName: 'device_id' });
db.logs.ensureIndex({ fieldName: 'timestamp' });

// Seed default admin
(async () => {
  try {
    const existing = await db.users.findOne({ username: 'admin' });
    if (!existing) {
      const hash = bcrypt.hashSync('admin123', 10);
      await db.users.insert({ username: 'admin', password: hash, role: 'admin', created_at: Date.now() });
      console.log('✅ Default admin: admin / admin123');
    }
    console.log(`✅ Database siap: ${DATA_DIR}`);
  } catch (_) {}
})();

module.exports = db;