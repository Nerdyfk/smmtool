/**
 * POST /api/admin/login
 * Admin authentication using Vercel environment variables.
 * Body: { email, password }
 * Returns: { token, admin }
 * 
 * Admin credentials are stored in ADMIN_EMAIL and ADMIN_PASSWORD env vars.
 */

const { generateToken, handleCors } = require('../../_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('[SMMTOOL] ADMIN_EMAIL or ADMIN_PASSWORD env vars not set!');
      return res.status(500).json({ error: 'Admin credentials not configured on the server.' });
    }

    if (email.toLowerCase() !== adminEmail.toLowerCase() || password !== adminPassword) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    const token = generateToken({
      userId: 'admin',
      email: adminEmail.toLowerCase(),
      role: 'admin'
    });

    return res.status(200).json({
      token,
      admin: {
        email: adminEmail.toLowerCase(),
        role: 'admin',
        name: 'SMMTOOL Admin',
        tier: 'Master Admin'
      }
    });
  } catch (error) {
    console.error('[SMMTOOL] Admin login error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
