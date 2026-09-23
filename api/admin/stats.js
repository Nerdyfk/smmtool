/**
 * GET /api/admin/stats
 * Dashboard telemetry: total orders, revenue, active services, open tickets.
 * Requires admin JWT.
 */

const { connectToDatabase } = require('../_lib/db');
const { requireAdmin, handleCors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    const { db } = await connectToDatabase();

    const [totalOrders, revenue, activeServices, openTickets, totalUsers, pendingDeposits] = await Promise.all([
      db.collection('orders').countDocuments(),
      db.collection('orders').aggregate([
        { $match: { status: { $nin: ['Cancelled', 'Refunded'] } } },
        { $group: { _id: null, total: { $sum: '$charge' } } }
      ]).toArray(),
      db.collection('services').countDocuments({ status: 'active' }),
      db.collection('tickets').countDocuments({ status: { $in: ['Open', 'In Review'] } }),
      db.collection('users').countDocuments(),
      db.collection('deposits').countDocuments({ status: 'pending' })
    ]);

    return res.status(200).json({
      totalOrders,
      revenue: revenue[0]?.total || 0,
      activeServices,
      openTickets,
      totalUsers,
      pendingDeposits
    });
  } catch (error) {
    console.error('[SMMTOOL] Admin stats error:', error);
    return res.status(500).json({ error: 'Failed to load dashboard stats.' });
  }
};
