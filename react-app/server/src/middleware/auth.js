import jwt from 'jsonwebtoken';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email_hash: user.email_hash },
    process.env.JWT_SECRET,
    { expiresIn: '15m', issuer: 'vvinmook', audience: 'web' }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, tokenVersion: Date.now() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d', issuer: 'vvinmook', audience: 'web' }
  );
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.access_token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'vvinmook' });
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'No autorizado para este rol' });
    next();
  };
}
