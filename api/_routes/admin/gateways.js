/**
 * GET/PUT /api/admin/gateways
 * GET: Get payment gateway configuration
 * PUT: Update gateway settings (bank, SSLCommerz, exchanges, EVM vault, custom)
 * Requires admin JWT.
 */

const { connectToDatabase } = require('../../_lib/db');
const { requireAdmin, handleCors } = require('../../_lib/auth');

const DEFAULT_GATEWAYS = {
  banglaQr: {
    enabled: true,
    bankName: 'City Bank PLC',
    accountNo: '1501204859001',
    holderName: 'SMMTOOL Technologies Ltd',
    routingNo: '225261895',
    branch: 'Gulshan Corporate Branch, Dhaka',
    bdtRate: 120,
    sslStoreId: 'smmtool_live',
    sslStorePass: ''
  },
  binance: {
    enabled: true,
    payId: '589204123'
  },
  bybit: {
    enabled: true,
    uid: '39481029'
  },
  evm: {
    enabled: true,
    vaultAddress: '0x2d36622575A76913b4d5521DA47e259C0579deEb'
  },
  custom: []
};

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { db } = await connectToDatabase();
  const gatewaysCol = db.collection('gateways');

  try {
    if (req.method === 'GET') {
      let config = await gatewaysCol.findOne({ configId: 'main' });
      if (!config) {
        // Initialize with defaults
        config = { configId: 'main', ...DEFAULT_GATEWAYS, createdAt: new Date() };
        await gatewaysCol.insertOne(config);
      }
      return res.status(200).json({ gateways: config });
    }

    if (req.method === 'PUT') {
      const updates = req.body || {};
      const { action } = updates;

      // Add custom gateway
      if (action === 'addCustom') {
        const { name, identifier } = updates;
        if (!name || !identifier) {
          return res.status(400).json({ error: 'Gateway name and identifier are required.' });
        }
        await gatewaysCol.updateOne(
          { configId: 'main' },
          {
            $push: { custom: { name, identifier, enabled: true, addedAt: new Date() } },
            $set: { updatedAt: new Date() }
          },
          { upsert: true }
        );
        return res.status(200).json({ message: `Gateway "${name}" added.` });
      }

      // Remove custom gateway
      if (action === 'removeCustom') {
        const { name } = updates;
        await gatewaysCol.updateOne(
          { configId: 'main' },
          {
            $pull: { custom: { name } },
            $set: { updatedAt: new Date() }
          }
        );
        return res.status(200).json({ message: `Gateway "${name}" removed.` });
      }

      // Full config update
      const allowedKeys = ['banglaQr', 'binance', 'bybit', 'evm', 'custom'];
      const safeUpdates = { updatedAt: new Date() };
      for (const key of allowedKeys) {
        if (updates[key] !== undefined) {
          safeUpdates[key] = updates[key];
        }
      }

      await gatewaysCol.updateOne(
        { configId: 'main' },
        { $set: safeUpdates },
        { upsert: true }
      );

      return res.status(200).json({ message: 'Gateway configuration saved.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[SMMTOOL] Admin gateways error:', error);
    return res.status(500).json({ error: 'Failed to process gateway request.' });
  }
};
