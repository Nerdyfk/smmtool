/**
 * GET/PUT /api/admin/deposits
 * GET: List all deposit requests (pending, confirmed, rejected)
 * PUT: Confirm or reject a deposit (credits user balance on confirmation)
 * Requires admin JWT.
 */

const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../lib/db');
const { requireAdmin, handleCors } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { db } = await connectToDatabase();
  const depositsCol = db.collection('deposits');
  const usersCol = db.collection('users');

  try {
    if (req.method === 'GET') {
      const { status } = req.query || {};
      const filter = {};
      if (status && status !== 'all') {
        filter.status = status;
      }

      const deposits = await depositsCol
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray();

      return res.status(200).json({ deposits });
    }

    if (req.method === 'PUT') {
      const { depositId, action } = req.body || {};

      if (!depositId || !action) {
        return res.status(400).json({ error: 'depositId and action are required.' });
      }

      const deposit = await depositsCol.findOne({ depositId });
      if (!deposit) {
        return res.status(404).json({ error: 'Deposit not found.' });
      }

      if (deposit.status !== 'pending') {
        return res.status(400).json({ error: `Deposit already ${deposit.status}.` });
      }

      if (action === 'confirm') {
        // Credit user balance
        try {
          await usersCol.updateOne(
            { _id: new ObjectId(deposit.userId) },
            {
              $inc: { balance: deposit.amount },
              $set: { updatedAt: new Date() }
            }
          );
        } catch (e) {
          await usersCol.updateOne(
            { username: deposit.customerUsername },
            {
              $inc: { balance: deposit.amount },
              $set: { updatedAt: new Date() }
            }
          );
        }

        await depositsCol.updateOne(
          { depositId },
          { $set: { status: 'confirmed', confirmedAt: new Date() } }
        );

        return res.status(200).json({
          message: `Deposit ${depositId} confirmed. $${deposit.amount.toFixed(2)} credited to user.`
        });
      }

      if (action === 'reject') {
        await depositsCol.updateOne(
          { depositId },
          { $set: { status: 'rejected', rejectedAt: new Date() } }
        );

        return res.status(200).json({ message: `Deposit ${depositId} rejected.` });
      }

      return res.status(400).json({ error: 'Invalid action. Use "confirm" or "reject".' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[SMMTOOL] Admin deposits error:', error);
    return res.status(500).json({ error: 'Failed to process deposit.' });
  }
};
