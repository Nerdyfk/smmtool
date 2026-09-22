/**
 * SMMTOOL Pro - User Problem Support & Ticket Submission Controller
 * Allows customers to submit problem requests (Order drops, refills, deposit verification)
 * and view real-time resolution updates and responses from SMMTOOL Admin.
 */

class SupportManager {
  constructor() {
    this.storageKey = 'smmtool_support_tickets';
    this.init();
  }

  init() {
    this.renderUserTickets();
    this.setupForm();
    window.addEventListener('tickets:updated', () => this.renderUserTickets());
  }

  getTickets() {
    if (window.adminManager && Array.isArray(window.adminManager.tickets)) {
      return window.adminManager.tickets;
    }
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return TOOLKITY_DATA.seedTickets || [];
  }

  renderUserTickets() {
    const container = document.getElementById('user-tickets-list-container');
    if (!container) return;

    const tickets = this.getTickets();
    if (tickets.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎫</div>
          <p>You have no active support tickets.</p>
          <span style="font-size: 0.78rem;">Submit an inquiry or order problem below for priority admin resolution.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = tickets.map(t => {
      const statusClass = t.status.toLowerCase().replace(/\s+/g, '-');
      const priorityClass = t.priority.toLowerCase();
      const lastMsg = t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1] : null;

      return `
        <div class="user-ticket-card">
          <div class="user-ticket-header">
            <div>
              <span class="user-ticket-id">${t.id}</span>
              <h4 class="user-ticket-subject">${t.subject}</h4>
              <div class="user-ticket-meta">Category: <strong>${t.category}</strong> • Priority: <span class="ticket-priority-pill ${priorityClass}">${t.priority}</span> • Order Ref: <strong>${t.orderId || 'None'}</strong></div>
            </div>
            <div style="text-align: right;">
              <span class="ticket-status-pill ${statusClass}">${t.status}</span>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.35rem;">${t.date}</div>
            </div>
          </div>

          <div class="user-ticket-thread">
            ${(t.messages || []).map(m => `
              <div class="ticket-msg-bubble ${m.sender === 'admin' ? 'admin' : 'user'}">
                <div class="ticket-msg-header">
                  <strong>${m.sender === 'admin' ? '🛡️ SMMTOOL Admin Support' : '👤 You'}</strong>
                  <span>${m.time}</span>
                </div>
                <div class="ticket-msg-body">${m.text}</div>
              </div>
            `).join('')}
          </div>

          ${t.status !== 'Resolved' && t.status !== 'Closed' ? `
            <div class="user-ticket-reply-box">
              <input type="text" class="form-input no-icon" id="reply-input-${t.id}" placeholder="Type a follow-up message to the admin...">
              <button type="button" class="btn-action-primary" style="padding: 0.5rem 1rem; font-size: 0.78rem;" onclick="window.supportManager.sendFollowUp('${t.id}')">
                <span>Send</span>
              </button>
            </div>
          ` : `
            <div style="padding: 0.65rem 1rem; background: rgba(16, 185, 129, 0.08); border-radius: var(--radius-md); font-size: 0.78rem; color: var(--color-emerald); display: flex; align-items: center; gap: 0.5rem; margin-top: 0.75rem;">
              <span>✓</span>
              <span>This ticket has been marked as <strong>${t.status}</strong> by our support team.</span>
            </div>
          `}
        </div>
      `;
    }).join('');
  }

  setupForm() {
    const form = document.getElementById('user-new-ticket-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const subject = document.getElementById('ticket-subject-input')?.value;
      const category = document.getElementById('ticket-category-select')?.value || 'Order Issue';
      const orderId = document.getElementById('ticket-order-ref-input')?.value || 'N/A';
      const priority = document.getElementById('ticket-priority-select')?.value || 'Medium';
      const description = document.getElementById('ticket-description-input')?.value;

      if (!subject || !description) {
        window.toolkityApp?.showToast('Missing Fields', 'Please provide a subject and problem description.', 'error');
        return;
      }

      const user = window.authManager?.user || { username: 'global_builder', email: 'builder@smmtool.pro' };
      const newId = 'TCK-' + (Math.floor(Math.random() * 9000) + 1000);
      const newTicket = {
        id: newId,
        username: user.username,
        email: user.email,
        category: category,
        subject: subject,
        orderId: orderId,
        priority: priority,
        status: 'Open',
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        messages: [
          {
            sender: "user",
            author: user.name || user.username,
            text: description,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]
      };

      if (window.adminManager) {
        window.adminManager.tickets.unshift(newTicket);
        window.adminManager.saveTickets();
        window.adminManager.renderTicketsTable();
      }

      this.renderUserTickets();
      form.reset();
      window.toolkityApp?.showToast('Ticket Submitted', `Ticket #${newId} dispatched to SMMTOOL Admin support queue.`, 'success');
    });
  }

  sendFollowUp(ticketId) {
    const input = document.getElementById(`reply-input-${ticketId}`);
    if (!input || !input.value.trim()) return;

    const tickets = this.getTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    if (!ticket.messages) ticket.messages = [];
    const user = window.authManager?.user || { username: 'global_builder' };

    ticket.messages.push({
      sender: "user",
      author: user.name || user.username,
      text: input.value.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    ticket.status = 'In Review';

    if (window.adminManager) {
      window.adminManager.saveTickets();
      window.adminManager.renderTicketsTable();
    }
    this.renderUserTickets();
    window.toolkityApp?.showToast('Message Sent', 'Follow-up sent to admin support.', 'info');
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.supportManager = new SupportManager();
});
