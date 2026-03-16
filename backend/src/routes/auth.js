const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/database');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi' });

    const user = await db.users.findOne({ username });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      await db.logs.insert({ level: 'warning', category: 'auth', message: `Login gagal: ${username}`, timestamp: Date.now() });
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    await db.logs.insert({ level: 'info', category: 'auth', message: `Login berhasil: ${username}`, timestamp: Date.now() });

    res.json({ token, user: { id: user._id, username: user.username, role: user.role }, expiresIn: '8h' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.users.findOne({ _id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json({ id: user._id, username: user.username, role: user.role });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/logout', authMiddleware, async (req, res) => {
  await db.logs.insert({ level: 'info', category: 'auth', message: `Logout: ${req.user.username}`, timestamp: Date.now() });
  res.json({ message: 'Logout berhasil' });
});

module.exports = router;