/**
 * POST/GET /api/orders
 * POST: Place a new order (auth required, deducts balance, triggers admin email)
 * GET: Get user's order history
 * Requires user JWT.
 */

const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('./_lib/db');
const { requireAuth, handleCors } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  const decoded = requireAuth(req, res);
  if (!decoded) return;

  const { db } = await connectToDatabase();
  const ordersCol = db.collection('orders');
  const usersCol = db.collection('users');
  const servicesCol = db.collection('services');

  try {
    if (req.method === 'GET') {
      const { status, limit = 50, skip = 0 } = req.query || {};
      const filter = { userId: decoded.userId };

      if (status && status !== 'all') {
        filter.status = status;
      }

      const orders = await ordersCol
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .toArray();

      return res.status(200).json({ orders });
    }

    if (req.method === 'POST') {
      const { serviceId, quantity, targetLink } = req.body || {};

      if (!serviceId || !quantity || !targetLink) {
        return res.status(400).json({ error: 'serviceId, quantity, and targetLink are required.' });
      }

      // Get the service
      const service = await servicesCol.findOne({ serviceId: parseInt(serviceId) });
      if (!service) {
        return res.status(404).json({ error: 'Service not found.' });
      }
      if (service.status === 'paused') {
        return res.status(400).json({ error: 'This service is currently paused.' });
      }

      const qty = parseInt(quantity);
      if (qty < service.minOrder || qty > service.maxOrder) {
        return res.status(400).json({
          error: `Quantity must be between ${service.minOrder} and ${service.maxOrder}.`
        });
      }

      // Calculate charge
      const charge = parseFloat(((service.ratePer1k / 1000) * qty).toFixed(4));

      // Get user and check balance
      let user;
      try {
        user = await usersCol.findOne({ _id: new ObjectId(decoded.userId) });
      } catch (e) {
        user = await usersCol.findOne({ email: decoded.email });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      if ((user.balance || 0) < charge) {
        return res.status(400).json({
          error: `Insufficient balance. Required: $${charge.toFixed(2)}, Available: $${(user.balance || 0).toFixed(2)}`
        });
      }

      // Generate order ID
      const orderNum = Math.floor(1000 + Math.random() * 9000);
      const orderId = `ORD-${orderNum}`;

      const newOrder = {
        orderId,
        userId: decoded.userId,
        customerUsername: user.username || user.email,
        serviceId: service.serviceId,
        serviceName: service.name,
        platform: service.platform,
        category: service.category,
        quantity: qty,
        charge,
        targetLink,
        status: 'In Progress',
        createdAt: new Date()
      };

      // Deduct balance and update user stats
      await usersCol.updateOne(
        { _id: user._id },
        {
          $inc: {
            balance: -charge,
            totalSpent: charge,
            ordersCount: 1
          },
          $set: { updatedAt: new Date() }
        }
      );

      await ordersCol.insertOne(newOrder);

      // Dispatch admin email notification (non-blocking)
      try {
        const alertSettings = await db.collection('admin_alerts').findOne({ configId: 'alerts' });
        if (alertSettings && alertSettings.triggers?.orders) {
          // Log the alert
          await db.collection('alert_log').insertOne({
            type: 'NEW_ORDER',
            orderId,
            customerUsername: user.username || user.email,
            serviceName: service.name,
            amount: charge,
            recipientEmail: alertSettings.email,
            timestamp: new Date()
          });

          // Send email via /api/notify (internal call)
          // This is done asynchronously - we don't await it
          sendAdminNotification(alertSettings.email, newOrder, user).catch(e =>
            console.error('[SMMTOOL] Email notification error:', e)
          );
        }
      } catch (alertError) {
        console.error('[SMMTOOL] Alert dispatch error:', alertError);
        // Don't fail the order if notification fails
      }

      // Get updated user balance
      const updatedUser = await usersCol.findOne({ _id: user._id });
      const { password, ...userProfile } = updatedUser;
      userProfile._id = updatedUser._id.toString();

      return res.status(201).json({
        message: `Order ${orderId} placed successfully!`,
        order: newOrder,
        user: userProfile
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[SMMTOOL] Orders error:', error);
    return res.status(500).json({ error: 'Failed to process order.' });
  }
};

/**
 * Send admin email notification for new order
 */
async function sendAdminNotification(adminEmail, order, user) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.log('[SMMTOOL] RESEND_API_KEY not set, skipping email notification');
    return;
  }

  try {
    const { Resend } = require('resend');
    const resend = new Resend(resendApiKey);

    await resend.emails.send({
      from: 'SMMTOOL Alerts <alerts@smmtool.pro>',
      to: adminEmail,
      subject: `⚡ [NEW ORDER] #${order.orderId} ($${order.charge.toFixed(2)} USD) by @${user.username || user.email}`,
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0d1117; color: #e6edf3; padding: 24px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #a855f7; font-size: 24px; margin: 0;">⚡ New Order Alert</h1>
            <p style="color: #8b949e; margin: 4px 0;">SMMTOOL Automated Dispatcher</p>
          </div>
          <div style="background: #161b22; padding: 16px; border-radius: 8px; border: 1px solid #30363d;">
            <table style="width: 100%; border-collapse: collapse; color: #e6edf3;">
              <tr><td style="padding: 8px 0; color: #8b949e;">Order ID</td><td style="padding: 8px 0; font-weight: 700; color: #58a6ff;">#${order.orderId}</td></tr>
              <tr><td style="padding: 8px 0; color: #8b949e;">Customer</td><td style="padding: 8px 0;">@${user.username || user.email}</td></tr>
              <tr><td style="padding: 8px 0; color: #8b949e;">Service</td><td style="padding: 8px 0;">${order.serviceName}</td></tr>
              <tr><td style="padding: 8px 0; color: #8b949e;">Platform</td><td style="padding: 8px 0;">${order.platform}</td></tr>
              <tr><td style="padding: 8px 0; color: #8b949e;">Quantity</td><td style="padding: 8px 0;">${order.quantity.toLocaleString()} units</td></tr>
              <tr><td style="padding: 8px 0; color: #8b949e;">Charge</td><td style="padding: 8px 0; font-weight: 700; color: #3fb950;">$${order.charge.toFixed(2)} USD</td></tr>
              <tr><td style="padding: 8px 0; color: #8b949e;">Target</td><td style="padding: 8px 0;"><a href="${order.targetLink}" style="color: #58a6ff;">${order.targetLink}</a></td></tr>
              <tr><td style="padding: 8px 0; color: #8b949e;">Timestamp</td><td style="padding: 8px 0;">${new Date().toISOString()}</td></tr>
            </table>
          </div>
          <p style="text-align: center; color: #8b949e; margin-top: 16px; font-size: 12px;">Status: API Dispatched to Provider Queue</p>
        </div>
      `
    });

    console.log(`[SMMTOOL] Email alert sent to ${adminEmail} for order ${order.orderId}`);
  } catch (error) {
    console.error('[SMMTOOL] Resend email error:', error);
  }
}
