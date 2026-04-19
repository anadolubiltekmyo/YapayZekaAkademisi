const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(64).toString('hex');

function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.clearCookie('token');
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş oturum' });
  }
}

module.exports = { JWT_SECRET, authMiddleware };
