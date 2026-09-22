/**
 * SMMTOOL Pro — JWT Authentication Middleware
 * Provides token generation, verification, and admin-only guards
 * for Vercel serverless API endpoints.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'smmtool_jwt_secret_change_in_production';
const TOKEN_EXPIRY = '30d';

/**
 * Generate a JWT token for a user or admin.
 * @param {Object} payload - { userId, email, role }
 * @returns {string} JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verify and decode a JWT token from the Authorization header.
 * @param {Object} req - HTTP request object
 * @returns {Object|null} Decoded payload or null if invalid
 */
function verifyToken(req) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

/**
 * Middleware: Require authentication. Returns decoded user or sends 401.
 * @param {Object} req
 * @param {Object} res
 * @returns {Object|null} decoded token payload, or null (response already sent)
 */
function requireAuth(req, res) {
  const decoded = verifyToken(req);
  if (!decoded) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return null;
  }
  return decoded;
}

/**
 * Middleware: Require admin role. Returns decoded admin payload or sends 403.
 * @param {Object} req
 * @param {Object} res
 * @returns {Object|null} decoded token payload with admin role, or null
 */
function requireAdmin(req, res) {
  const decoded = verifyToken(req);
  if (!decoded) {
    res.status(401).json({ error: 'Authentication required.' });
    return null;
  }
  if (decoded.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required.' });
    return null;
  }
  return decoded;
}

/**
 * CORS preflight handler for OPTIONS requests.
 * Call at the top of every API handler.
 */
function handleCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

module.exports = { generateToken, verifyToken, requireAuth, requireAdmin, handleCors };
