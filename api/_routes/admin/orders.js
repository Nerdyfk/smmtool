/**
 * GET/PUT /api/admin/orders
 * GET: List all orders across all users (with filters)
 * PUT: Override order status, process refunds
 * Requires admin JWT.
 */

const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../../_lib/db');
const { requireAdmin, handleCors } = require('../../_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { db } = await connectToDatabase();
  const ordersCol = db.collection('orders');
  const usersCol = db.collection('users');

  try {
    if (req.method === 'GET') {
      const { status, search, dateRange, startDate, endDate, limit = 100, skip = 0 } = req.query || {};
      const filter = {};

      if (status && status !== 'all') {
        filter.status = status;
      }
      if (search) {
        filter.$or = [
          { orderId: { $regex: search, $options: 'i' } },
          { serviceName: { $regex: search, $options: 'i' } },
          { targetLink: { $regex: search, $options: 'i' } },
          { customerUsername: { $regex: search, $options: 'i' } }
        ];
      }

      if (dateRange && dateRange !== 'all') {
        const now = new Date();
        if (dateRange === '24h') {
          filter.createdAt = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
        } else if (dateRange === '7d') {
          filter.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
        } else if (dateRange === '30d') {
          filter.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
        } else if (dateRange === 'today') {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          filter.createdAt = { $gte: startOfToday };
        } else if (dateRange === 'yesterday') {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
          filter.createdAt = { $gte: startOfYesterday, $lt: startOfToday };
        }
      } else if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
          filter.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          const endD = new Date(endDate);
          endD.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = endD;
        }
      }

      const orders = await ordersCol
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .toArray();

      const total = await ordersCol.countDocuments(filter);

      return res.status(200).json({ orders, total });
    }

    if (req.method === 'PUT') {
      const { orderId, newStatus } = req.body || {};

      if (!orderId || !newStatus) {
        return res.status(400).json({ error: 'orderId and newStatus are required.' });
      }

      const validStatuses = ['Pending', 'In Progress', 'Completed', 'Cancelled', 'Refunded', 'Partial'];
      if (!validStatuses.includes(newStatus)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }

      const order = await ordersCol.findOne({ orderId });
      if (!order) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      // Process refund if cancelling or refunding
      if (['Cancelled', 'Refunded'].includes(newStatus) && !['Cancelled', 'Refunded'].includes(order.status)) {
        if (order.userId) {
          try {
            await usersCol.updateOne(
              { _id: new ObjectId(order.userId) },
              {
                $inc: { balance: order.charge },
                $set: { updatedAt: new Date() }
              }
            );
          } catch (e) {
            // userId might not be valid ObjectId for legacy data
            await usersCol.updateOne(
              { username: order.customerUsername },
              {
                $inc: { balance: order.charge },
                $set: { updatedAt: new Date() }
              }
            );
          }
        }
      }

      await ordersCol.updateOne(
        { orderId },
        { $set: { status: newStatus, updatedAt: new Date() } }
      );

      return res.status(200).json({
        message: `Order ${orderId} updated to ${newStatus}.`,
        refunded: ['Cancelled', 'Refunded'].includes(newStatus) ? order.charge : 0
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[SMMTOOL] Admin orders error:', error);
    return res.status(500).json({ error: 'Failed to process order request.' });
  }
};
