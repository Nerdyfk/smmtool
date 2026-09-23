/**
 * GET/PUT /api/admin/tickets
 * GET: List all support tickets (with filters)
 * PUT: Reply to ticket, change status, issue refund
 * Requires admin JWT.
 */

const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../_lib/db');
const { requireAdmin, handleCors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { db } = await connectToDatabase();
  const ticketsCol = db.collection('tickets');
  const usersCol = db.collection('users');

  try {
    if (req.method === 'GET') {
      const { status, search } = req.query || {};
      const filter = {};

      if (status && status !== 'all') {
        filter.status = status;
      }
      if (search) {
        filter.$or = [
          { ticketId: { $regex: search, $options: 'i' } },
          { subject: { $regex: search, $options: 'i' } },
          { customerUsername: { $regex: search, $options: 'i' } }
        ];
      }

      const tickets = await ticketsCol.find(filter).sort({ createdAt: -1 }).toArray();
      return res.status(200).json({ tickets });
    }

    if (req.method === 'PUT') {
      const { ticketId, action, reply, newStatus, refundAmount } = req.body || {};

      if (!ticketId) {
        return res.status(400).json({ error: 'ticketId is required.' });
      }

      const ticket = await ticketsCol.findOne({ ticketId });
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found.' });
      }

      const updateOps = { $set: { updatedAt: new Date() } };

      // Add admin reply to messages
      if (action === 'reply' && reply) {
        updateOps.$push = {
          messages: {
            sender: 'admin',
            text: reply,
            timestamp: new Date().toISOString()
          }
        };
      }

      // Update status
      if (newStatus) {
        const validStatuses = ['Open', 'In Review', 'Resolved', 'Closed'];
        if (validStatuses.includes(newStatus)) {
          updateOps.$set.status = newStatus;
        }
      }

      await ticketsCol.updateOne({ ticketId }, updateOps);

      // Process refund if requested
      if (action === 'refund' && refundAmount > 0 && ticket.userId) {
        try {
          await usersCol.updateOne(
            { _id: new ObjectId(ticket.userId) },
            {
              $inc: { balance: parseFloat(refundAmount) },
              $set: { updatedAt: new Date() }
            }
          );
        } catch (e) {
          await usersCol.updateOne(
            { username: ticket.customerUsername },
            {
              $inc: { balance: parseFloat(refundAmount) },
              $set: { updatedAt: new Date() }
            }
          );
        }

        // Mark refund in ticket
        await ticketsCol.updateOne(
          { ticketId },
          {
            $push: {
              messages: {
                sender: 'system',
                text: `Refund of $${parseFloat(refundAmount).toFixed(2)} USD has been issued to the customer's balance.`,
                timestamp: new Date().toISOString()
              }
            }
          }
        );

        return res.status(200).json({ message: `Refund of $${parseFloat(refundAmount).toFixed(2)} issued. Ticket updated.` });
      }

      return res.status(200).json({ message: 'Ticket updated successfully.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[SMMTOOL] Admin tickets error:', error);
    return res.status(500).json({ error: 'Failed to process ticket request.' });
  }
};
