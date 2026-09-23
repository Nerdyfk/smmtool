/**
 * POST /api/wallet/deposit
 * Submit a deposit request (EVM tx hash, Bangla QR reference, exchange pay).
 * Stores in deposits collection for admin verification.
 * Requires user JWT.
 */

const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../_lib/db');
const { requireAuth, handleCors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = requireAuth(req, res);
  if (!decoded) return;

  try {
    const { method, amount, txHash, chain, senderAddress, reference } = req.body || {};

    if (!method || !amount) {
      return res.status(400).json({ error: 'Deposit method and amount are required.' });
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount.' });
    }

    const { db } = await connectToDatabase();
    const usersCol = db.collection('users');
    const depositsCol = db.collection('deposits');

    // Get user
    let user;
    try {
      user = await usersCol.findOne({ _id: new ObjectId(decoded.userId) });
    } catch (e) {
      user = await usersCol.findOne({ email: decoded.email });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Generate deposit ID
    const depNum = Math.floor(10000 + Math.random() * 90000);
    const depositId = `DEP-${depNum}`;

    const newDeposit = {
      depositId,
      userId: decoded.userId,
      customerUsername: user.username || user.email,
      method, // 'evm', 'bangla-qr', 'exchange-pay'
      amount: depositAmount,
      txHash: txHash || null,
      chain: chain || null,
      senderAddress: senderAddress || null,
      reference: reference || null,
      status: 'pending', // pending | confirmed | rejected
      createdAt: new Date()
    };

    await depositsCol.insertOne(newDeposit);

    // Log alert for admin
    try {
      const alertSettings = await db.collection('admin_alerts').findOne({ configId: 'alerts' });
      if (alertSettings && alertSettings.triggers?.deposits) {
        await db.collection('alert_log').insertOne({
          type: 'NEW_DEPOSIT',
          depositId,
          customerUsername: user.username || user.email,
          method,
          amount: depositAmount,
          txHash: txHash || reference || 'N/A',
          recipientEmail: alertSettings.email,
          timestamp: new Date()
        });
      }
    } catch (alertError) {
      console.error('[SMMTOOL] Deposit alert error:', alertError);
    }

    return res.status(201).json({
      message: `Deposit request ${depositId} submitted. It will be verified and credited shortly.`,
      deposit: newDeposit
    });
  } catch (error) {
    console.error('[SMMTOOL] Deposit error:', error);
    return res.status(500).json({ error: 'Failed to process deposit.' });
  }
};
