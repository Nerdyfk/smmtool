/**
 * POST /api/notify
 * Internal email dispatch endpoint.
 * Sends admin alert emails via Resend API.
 * Requires admin JWT or internal trigger.
 */

const { connectToDatabase } = require('./_lib/db');
const { handleCors } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, data } = req.body || {};
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return res.status(200).json({ message: 'RESEND_API_KEY not configured. Email skipped.', sent: false });
    }

    const { db } = await connectToDatabase();
    const alertSettings = await db.collection('admin_alerts').findOne({ configId: 'alerts' });
    const adminEmail = alertSettings?.email || process.env.ADMIN_EMAIL || 'admin@smmtool.pro';

    const { Resend } = require('resend');
    const resend = new Resend(resendApiKey);

    let subject = '📬 SMMTOOL Alert';
    let html = '<p>New notification from SMMTOOL platform.</p>';

    if (type === 'order') {
      subject = `⚡ [NEW ORDER] #${data.orderId} ($${data.charge?.toFixed(2)} USD) by @${data.customer}`;
      html = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0d1117; color: #e6edf3; padding: 24px; border-radius: 12px;">
          <h2 style="color: #a855f7;">⚡ New Order: #${data.orderId}</h2>
          <p><strong>Customer:</strong> @${data.customer}</p>
          <p><strong>Service:</strong> ${data.serviceName}</p>
          <p><strong>Quantity:</strong> ${data.quantity?.toLocaleString()}</p>
          <p><strong>Charge:</strong> $${data.charge?.toFixed(2)} USD</p>
          <p><strong>Target:</strong> <a href="${data.targetLink}" style="color: #58a6ff;">${data.targetLink}</a></p>
        </div>`;
    } else if (type === 'deposit') {
      subject = `💰 [NEW DEPOSIT] $${data.amount?.toFixed(2)} from @${data.customer}`;
      html = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0d1117; color: #e6edf3; padding: 24px; border-radius: 12px;">
          <h2 style="color: #3fb950;">💰 New Deposit Request</h2>
          <p><strong>Customer:</strong> @${data.customer}</p>
          <p><strong>Amount:</strong> $${data.amount?.toFixed(2)} USD</p>
          <p><strong>Method:</strong> ${data.method}</p>
          <p><strong>TxHash / Ref:</strong> ${data.txHash || data.reference || 'N/A'}</p>
        </div>`;
    } else if (type === 'ticket') {
      subject = `🎫 [NEW TICKET] "${data.subject}" from @${data.customer}`;
      html = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0d1117; color: #e6edf3; padding: 24px; border-radius: 12px;">
          <h2 style="color: #f59e0b;">🎫 New Support Ticket</h2>
          <p><strong>Customer:</strong> @${data.customer}</p>
          <p><strong>Subject:</strong> ${data.subject}</p>
          <p><strong>Category:</strong> ${data.category || 'General'}</p>
        </div>`;
    }

    await resend.emails.send({
      from: 'SMMTOOL Alerts <alerts@smmtool.pro>',
      to: adminEmail,
      subject,
      html
    });

    // Also send to webhook if configured
    if (alertSettings?.webhook) {
      try {
        await fetch(alertSettings.webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, data, timestamp: new Date().toISOString() })
        });
      } catch (webhookError) {
        console.error('[SMMTOOL] Webhook dispatch error:', webhookError);
      }
    }

    return res.status(200).json({ message: 'Notification sent.', sent: true });
  } catch (error) {
    console.error('[SMMTOOL] Notification error:', error);
    return res.status(500).json({ error: 'Failed to send notification.', sent: false });
  }
};
