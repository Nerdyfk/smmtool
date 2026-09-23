/**
 * GET /api/wallet/balance
 * Get user's current balance.
 * Requires user JWT.
 */

const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../../_lib/db');
const { requireAuth, handleCors } = require('../../_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = requireAuth(req, res);
  if (!decoded) return;

  try {
    const { db } = await connectToDatabase();
    const usersCol = db.collection('users');

    let user;
    try {
      user = await usersCol.findOne({ _id: new ObjectId(decoded.userId) });
    } catch (e) {
      user = await usersCol.findOne({ email: decoded.email });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Get recent deposits
    const deposits = await db.collection('deposits')
      .find({ userId: decoded.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    return res.status(200).json({
      balance: user.balance || 0,
      totalSpent: user.totalSpent || 0,
      ordersCount: user.ordersCount || 0,
      deposits
    });
  } catch (error) {
    console.error('[SMMTOOL] Balance error:', error);
    return res.status(500).json({ error: 'Failed to get balance.' });
  }
};
