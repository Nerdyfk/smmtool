/**
 * GET /api/auth/me
 * Restore session — returns the current user profile from JWT token.
 * Headers: Authorization: Bearer <token>
 * Returns: { user }
 */

const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../../_lib/db');
const { requireAuth, handleCors } = require('../../_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const decoded = requireAuth(req, res);
    if (!decoded) return; // 401 already sent

    const { db } = await connectToDatabase();
    const usersCol = db.collection('users');

    let user;
    try {
      user = await usersCol.findOne({ _id: new ObjectId(decoded.userId) });
    } catch (e) {
      // If userId is not a valid ObjectId, try by email
      user = await usersCol.findOne({ email: decoded.email });
    }

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // Return user profile (without password)
    const { password, ...userProfile } = user;
    userProfile._id = user._id.toString();

    return res.status(200).json({ user: userProfile });
  } catch (error) {
    console.error('[SMMTOOL] Session restore error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
