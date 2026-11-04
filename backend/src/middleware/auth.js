const jwt = require('jsonwebtoken');

const SECRET = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  return process.env.JWT_SECRET;
};

function signToken(user) {
  return jwt.sign({ id: user.user_id, role: user.role, name: user.name }, SECRET(), { expiresIn: '7d' });
}

// 401 when there is no valid token.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in.' });
  try {
    req.user = jwt.verify(token, SECRET());
    return next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}

// 403 when the user is logged in but has the wrong role. Checked on the server, not only in the UI.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do this.' });
    }
    return next();
  };
}

module.exports = { signToken, requireAuth, requireRole };
