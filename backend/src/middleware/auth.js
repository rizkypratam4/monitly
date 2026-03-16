const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'netwatch_secret_key_ganti_di_production';

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token tidak ada atau tidak valid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token expired atau tidak valid' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Hanya admin yang bisa akses ini' });
  }
  next();
}

module.exports = { authMiddleware, adminOnly, JWT_SECRET };