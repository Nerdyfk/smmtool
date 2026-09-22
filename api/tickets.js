/**
 * POST/GET /api/tickets
 * POST: Create a new support ticket
 * GET: Get user's own tickets
 * Requires user JWT.
 */

const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('./lib/db');
const { requireAuth, handleCors } = require('./lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  const decoded = requireAuth(req, res);
  if (!decoded) return;

  const { db } = await connectToDatabase();
  const ticketsCol = db.collection('tickets');
  const usersCol = db.collection('users');

  try {
    if (req.method === 'GET') {
      const tickets = await ticketsCol
        .find({ userId: decoded.userId })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({ tickets });
    }

    if (req.method === 'POST') {
      const { subject, category, priority, message, orderReference } = req.body || {};

      if (!subject || !message) {
        return res.status(400).json({ error: 'Subject and message are required.' });
      }

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

      const ticketNum = Math.floor(1000 + Math.random() * 9000);
      const ticketId = `TCK-${ticketNum}`;

      const newTicket = {
        ticketId,
        userId: decoded.userId,
        customerUsername: user.username || user.email,
        subject,
        category: category || 'General',
        priority: priority || 'Normal',
        orderReference: orderReference || null,
        status: 'Open',
        messages: [
          {
            sender: 'user',
            text: message,
            timestamp: new Date().toISOString()
          }
        ],
        createdAt: new Date()
      };

      await ticketsCol.insertOne(newTicket);

      // Log alert
      try {
        const alertSettings = await db.collection('admin_alerts').findOne({ configId: 'alerts' });
        if (alertSettings && alertSettings.triggers?.tickets) {
          await db.collection('alert_log').insertOne({
            type: 'NEW_TICKET',
            ticketId,
            customerUsername: user.username || user.email,
            subject,
            recipientEmail: alertSettings.email,
            timestamp: new Date()
          });
        }
      } catch (alertError) {
        console.error('[SMMTOOL] Ticket alert error:', alertError);
      }

      return res.status(201).json({
        message: `Ticket ${ticketId} created. Our team will respond shortly.`,
        ticket: newTicket
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[SMMTOOL] Tickets error:', error);
    return res.status(500).json({ error: 'Failed to process ticket.' });
  }
};
