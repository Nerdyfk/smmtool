/**
 * GET/PUT /api/admin/alerts
 * GET: Get alert settings and dispatched alert log
 * PUT: Update admin email, notification triggers, webhook URL
 * Requires admin JWT.
 */

const { connectToDatabase } = require('../lib/db');
const { requireAdmin, handleCors } = require('../lib/auth');

const DEFAULT_ALERT_SETTINGS = {
  configId: 'alerts',
  email: 'admin@smmtool.pro',
  triggers: {
    orders: true,
    deposits: true,
    tickets: true
  },
  webhook: '',
  desktopEnabled: false
};

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { db } = await connectToDatabase();
  const alertsCol = db.collection('admin_alerts');

  try {
    if (req.method === 'GET') {
      let settings = await alertsCol.findOne({ configId: 'alerts' });
      if (!settings) {
        settings = { ...DEFAULT_ALERT_SETTINGS, createdAt: new Date() };
        await alertsCol.insertOne(settings);
      }

      // Get recent alert log entries
      const alertLog = await db.collection('alert_log')
        .find({})
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray();

      return res.status(200).json({ settings, alertLog });
    }

    if (req.method === 'PUT') {
      const { email, triggers, webhook } = req.body || {};

      const updateFields = { updatedAt: new Date() };
      if (email) updateFields.email = email;
      if (triggers) updateFields.triggers = triggers;
      if (webhook !== undefined) updateFields.webhook = webhook;

      await alertsCol.updateOne(
        { configId: 'alerts' },
        { $set: updateFields },
        { upsert: true }
      );

      return res.status(200).json({ message: 'Alert settings saved.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[SMMTOOL] Admin alerts error:', error);
    return res.status(500).json({ error: 'Failed to process alert settings.' });
  }
};
