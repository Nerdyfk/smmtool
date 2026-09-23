/**
 * SMMTOOL Pro - Flagship New Order & Order History Controller
 * Powers dynamic category/service selection, real-time USD cost calculation,
 * active/paused service enforcement, balance deduction, and live order tracking.
 */

class OrdersManager {
  constructor() {
    this.orders = this.loadOrders();
    this.selectedCategory = 'twitter';
    this.selectedServiceId = null;
    this.quantity = 1000;

    this.init();
  }

  init() {
    this.setupNewOrderForm();
    this.setupOrderHistoryView();

    window.addEventListener('auth:updated', () => {
      this.updateBalanceIndicator();
      this.renderOrdersTable();
    });

    window.addEventListener('services:updated', () => {
      this.populateServicesForCategory();
    });
  }

  loadOrders() {
    try {
      const saved = localStorage.getItem('smmtool_user_orders') || localStorage.getItem('toolkity_user_orders');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading orders:', e);
    }
    return TOOLKITY_DATA.seedOrders || [];
  }

  saveOrders() {
    try {
      localStorage.setItem('smmtool_user_orders', JSON.stringify(this.orders));
    } catch (e) {
      console.error('Error saving orders:', e);
    }
    this.renderOrdersTable();
    if (window.adminManager && typeof window.adminManager.renderOrdersTable === 'function') {
      window.adminManager.renderOrdersTable();
    }
  }

  setupNewOrderForm() {
    const categorySelect = document.getElementById('new-order-category-select');
    const serviceSelect = document.getElementById('new-order-service-select');
    const qtyInput = document.getElementById('new-order-quantity-input');
    const linkInput = document.getElementById('new-order-link-input');
    const form = document.getElementById('new-order-form');

    if (!categorySelect || !serviceSelect) return;

    // Populate Categories
    if (TOOLKITY_DATA.categories) {
      categorySelect.innerHTML = TOOLKITY_DATA.categories.map(c => `
        <option value="${c.id}">${c.name}</option>
      `).join('');
    }

    categorySelect.addEventListener('change', (e) => {
      this.selectedCategory = e.target.value;
      this.populateServicesForCategory();
    });

    serviceSelect.addEventListener('change', (e) => {
      this.selectedServiceId = parseInt(e.target.value, 10);
      this.updateServiceDetails();
      this.calculateTotalCharge();
    });

    if (qtyInput) {
      qtyInput.value = this.quantity;
      qtyInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val)) val = 100;
        this.quantity = val;
        this.calculateTotalCharge();
      });
    }

    // Initialize services
    this.populateServicesForCategory();

    // Form submit
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitNewOrder();
      });
    }
  }

  populateServicesForCategory() {
    const serviceSelect = document.getElementById('new-order-service-select');
    if (!serviceSelect || !TOOLKITY_DATA.smmServices) return;

    const filtered = TOOLKITY_DATA.smmServices.filter(s =>
      s.platform.toLowerCase() === this.selectedCategory.toLowerCase()
    );

    if (filtered.length === 0) {
      serviceSelect.innerHTML = '<option value="">No services available for this platform</option>';
      this.selectedServiceId = null;
      this.updateServiceDetails();
      this.calculateTotalCharge();
      return;
    }

    // Group services by category/subcategory for clean user experience
    const groups = {};
    filtered.forEach(s => {
      const cat = s.category || 'General Services';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });

    let html = '';
    for (const [catName, services] of Object.entries(groups)) {
      html += `<optgroup label="${catName}">`;
      services.forEach(s => {
        const isPaused = s.status === 'paused';
        const formattedRate = s.ratePer1000 < 0.1 ? s.ratePer1000.toFixed(3) : s.ratePer1000.toFixed(2);
        html += `
          <option value="${s.id}" ${isPaused ? 'disabled' : ''}>
            #${s.id} - ${s.name} ${isPaused ? '⚠️ [PAUSED BY ADMIN]' : `— $${formattedRate} / 1k`}
          </option>
        `;
      });
      html += `</optgroup>`;
    }

    serviceSelect.innerHTML = html;

    const firstActive = filtered.find(s => s.status !== 'paused') || filtered[0];
    if (firstActive) {
      this.selectedServiceId = firstActive.id;
      serviceSelect.value = firstActive.id.toString();
    } else {
      this.selectedServiceId = null;
    }

    this.updateServiceDetails();
    this.calculateTotalCharge();
  }

  selectServiceFromCatalog(serviceId) {
    const sId = parseInt(serviceId, 10);
    const service = TOOLKITY_DATA.smmServices.find(s => s.id === sId);
    if (!service) return;

    this.selectedCategory = service.platform.toLowerCase();
    const catSelect = document.getElementById('new-order-category-select');
    if (catSelect) {
      catSelect.value = this.selectedCategory;
    }

    this.populateServicesForCategory();

    const serviceSelect = document.getElementById('new-order-service-select');
    if (serviceSelect) {
      serviceSelect.value = sId.toString();
      this.selectedServiceId = sId;
    }

    this.updateServiceDetails();
    this.calculateTotalCharge();

    if (window.toolkityApp) {
      window.toolkityApp.switchView('new-order');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  updateServiceDetails() {
    const service = TOOLKITY_DATA.smmServices.find(s => s.id === this.selectedServiceId);
    const box = document.getElementById('new-order-service-details-box');
    if (!box) return;

    if (!service) {
      box.style.display = 'none';
      return;
    }

    const isPaused = service.status === 'paused';
    const formattedRate = service.ratePer1000 < 0.1 ? service.ratePer1000.toFixed(3) : service.ratePer1000.toFixed(2);
    box.style.display = 'block';
    box.innerHTML = `
      <div class="service-detail-item">
        <strong>Service:</strong> #${service.id} - ${service.name} ${isPaused ? '<span class="status-badge paused" style="margin-left: 0.5rem;">PAUSED</span>' : ''}
      </div>
      <div class="service-detail-item">
        <strong>Description:</strong> ${service.description}
      </div>
      <div class="service-detail-meta-grid">
        <div><strong>Rate / 1k:</strong> <span style="color: var(--color-emerald); font-weight:800;">$${formattedRate} USD</span></div>
        <div><strong>Min / Max:</strong> ${service.min.toLocaleString()} / ${service.max.toLocaleString()}</div>
        <div><strong>Speed:</strong> ${service.speed}</div>
        <div><strong>Status:</strong> <span style="color: ${isPaused ? 'var(--color-amber)' : 'var(--color-emerald)'}; font-weight: 800;">${isPaused ? 'Paused' : 'Active'}</span></div>
      </div>
    `;

    const qtyInput = document.getElementById('new-order-quantity-input');
    if (qtyInput) {
      qtyInput.min = service.min || 100;
      qtyInput.max = service.max || 100000;
      qtyInput.step = 100;
    }
  }

  calculateTotalCharge() {
    const service = TOOLKITY_DATA.smmServices.find(s => s.id === this.selectedServiceId);
    const chargeDisplay = document.getElementById('new-order-calculated-charge');
    if (!chargeDisplay) return;

    if (!service) {
      chargeDisplay.textContent = "$0.00 USD";
      return;
    }

    const cost = (this.quantity / 1000) * service.ratePer1000;
    const finalCost = Math.max(0.001, cost);
    const displayCost = finalCost < 0.1 ? finalCost.toFixed(3) : finalCost.toFixed(2);
    chargeDisplay.textContent = `$${displayCost} USD`;

    this.updateBalanceIndicator(finalCost);
  }

  updateBalanceIndicator(currentCost = 0) {
    const balanceNotice = document.getElementById('new-order-balance-notice');
    if (!balanceNotice || !window.authManager) return;

    const user = window.authManager.user;
    const isLoggedIn = Boolean(user && user.isLoggedIn);

    if (!isLoggedIn) {
      balanceNotice.innerHTML = `
        <span style="color: #60a5fa; font-weight: 600;">🔒 Sign in to place orders</span>
        <span style="color: var(--text-muted); font-size: 0.8rem;">(<a href="javascript:void(0)" onclick="window.authManager.openLoginModal()" style="color: var(--color-twitter); text-decoration: underline; font-weight: 600;">Sign in with Google</a>)</span>
      `;
      return;
    }

    const balance = user.balance || 0;

    if (balance >= currentCost) {
      balanceNotice.innerHTML = `
        <span style="color: var(--color-emerald);">✓ Account Balance: $${balance.toFixed(2)} USD</span>
        <span style="color: var(--text-muted); font-size: 0.8rem;">(Sufficient funds available)</span>
      `;
    } else {
      balanceNotice.innerHTML = `
        <span style="color: var(--color-amber);">⚠️ Account Balance: $${balance.toFixed(2)} USD</span>
        <span style="color: var(--text-muted); font-size: 0.8rem;">(Requires $${(currentCost - balance).toFixed(2)} more. <a href="javascript:void(0)" onclick="window.toolkityApp.switchView('add-funds')" style="color: var(--color-twitter); text-decoration: underline;">Deposit Funds</a>)</span>
      `;
    }
  }

  submitNewOrder() {
    const service = TOOLKITY_DATA.smmServices.find(s => s.id === this.selectedServiceId);
    const linkInput = document.getElementById('new-order-link-input');
    const link = (linkInput?.value || '').trim();

    if (!service) {
      window.toolkityApp?.showToast('Select Service', 'Please select a valid service.', 'warning');
      return;
    }

    if (service.status === 'paused') {
      window.toolkityApp?.showToast('Service Paused', 'This service is currently paused for provider maintenance. Please pick another active service.', 'warning');
      return;
    }

    if (!link || link.length < 5) {
      window.toolkityApp?.showToast('Link Required', 'Please enter a valid target post or profile URL.', 'warning');
      linkInput?.focus();
      return;
    }

    const cost = (this.quantity / 1000) * service.ratePer1000;
    const finalCost = Math.max(0.001, cost);
    const formattedCost = finalCost < 0.1 ? finalCost.toFixed(3) : finalCost.toFixed(2);

    // Check if user is logged in
    if (!window.authManager || !window.authManager.user || !window.authManager.user.isLoggedIn) {
      window.toolkityApp?.showToast('Sign In Required', 'Please sign in or register to dispatch orders from account balance.', 'info');
      window.authManager.openLoginModal();
      return;
    }

    // Try deducting balance
    const success = window.authManager.deductBalance(finalCost);

    if (!success) {
      window.toolkityApp?.showToast(
        'Insufficient Balance',
        `Order cost is $${formattedCost} USD, but your balance is $${window.authManager.user.balance.toFixed(2)} USD. Please deposit funds via Bangla QR or Crypto.`,
        'warning'
      );
      window.toolkityApp?.switchView('add-funds');
      return;
    }

    // Generate Order Record
    const newOrderId = "ORD-" + Math.floor(1000 + Math.random() * 9000);
    const orderRecord = {
      id: newOrderId,
      customer: window.authManager.user.username || 'user',
      serviceName: service.name,
      platform: service.platform,
      link: link,
      quantity: this.quantity,
      charge: `$${formattedCost}`,
      status: "In Progress",
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    this.orders.unshift(orderRecord);
    this.saveOrders();

    // Instant Admin Email Notification Dispatch
    this.dispatchAdminEmailNotification(orderRecord);

    // Instant Telegram Alert if user linked Telegram
    if (typeof window.dispatchTelegramOrderNotification === 'function') {
      window.dispatchTelegramOrderNotification(orderRecord, 'In Progress');
    }

    // Automated delivery progression simulation for real-time Telegram completion alert
    setTimeout(() => {
      const order = this.orders.find(o => o.id === newOrderId);
      if (order && order.status === 'In Progress') {
        order.status = 'Completed';
        this.saveOrders();
        this.renderOrdersTable();
        window.dispatchEvent(new CustomEvent('order:completed', { detail: order }));
      }
    }, 12000);

    if (linkInput) linkInput.value = '';

    window.toolkityApp?.showToast(
      'Order Placed Successfully!',
      `Order #${newOrderId} confirmed! Charge: $${formattedCost} USD. SMMTOOL automated API execution started.`,
      'success'
    );

    // Switch to order history to view
    window.toolkityApp?.switchView('orders-history');
  }

  dispatchAdminEmailNotification(orderRecord) {
    try {
      const emailSettings = JSON.parse(localStorage.getItem('smmtool_admin_email_settings') || '{}');
      const adminEmail = emailSettings.email || localStorage.getItem('smmtool_admin_email') || 'admin@smmtool.pro';
      const notificationsEnabled = emailSettings.notifyOnOrders !== false;

      if (!notificationsEnabled) return;

      const alertItem = {
        id: 'ALT-' + Math.floor(100000 + Math.random() * 900000),
        type: 'NEW_ORDER',
        recipient: adminEmail,
        orderId: orderRecord.id,
        customer: orderRecord.customer,
        service: orderRecord.serviceName,
        platform: orderRecord.platform,
        quantity: orderRecord.quantity,
        charge: orderRecord.charge,
        link: orderRecord.link,
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status: 'Delivered',
        subject: `⚡ [NEW ORDER ALERT] #${orderRecord.id} (${orderRecord.charge}) by @${orderRecord.customer}`
      };

      // Save to admin alerts log
      const existingAlerts = JSON.parse(localStorage.getItem('smmtool_admin_alerts') || '[]');
      existingAlerts.unshift(alertItem);
      localStorage.setItem('smmtool_admin_alerts', JSON.stringify(existingAlerts.slice(0, 100)));

      // Optional external webhook dispatch (e.g. Discord, Telegram, or Email API)
      if (emailSettings.webhookUrl && emailSettings.webhookUrl.startsWith('http')) {
        fetch(emailSettings.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alertItem)
        }).catch(err => console.warn('Admin webhook dispatch error:', err));
      }

      // Trigger Web Notification if granted
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(`SMMTOOL New Order: ${orderRecord.id}`, {
          body: `${orderRecord.serviceName} - ${orderRecord.charge} from @${orderRecord.customer}`,
          icon: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'
        });
      }

      console.log(`[Admin Dispatch] Instant Order Notification routed to Admin Email: ${adminEmail}`);
    } catch (e) {
      console.error('Error dispatching admin notification:', e);
    }
  }

  setupOrderHistoryView() {
    this.activeStatusFilter = 'all';
    this.renderOrdersTable();

    const filterContainer = document.getElementById('orders-status-filters');
    if (filterContainer) {
      filterContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.orders-filter-btn');
        if (!btn) return;
        filterContainer.querySelectorAll('.orders-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeStatusFilter = btn.getAttribute('data-status');
        this.renderOrdersTable();
      });
    }

    const searchInput = document.getElementById('orders-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.renderOrdersTable();
      });
    }
  }

  renderOrdersTable() {
    const guestGate = document.getElementById('orders-history-guest-gate');
    const userContent = document.getElementById('orders-history-user-content');
    const isLoggedIn = Boolean(window.authManager && window.authManager.user && window.authManager.user.isLoggedIn);

    if (guestGate) guestGate.style.display = isLoggedIn ? 'none' : 'flex';
    if (userContent) userContent.style.display = isLoggedIn ? 'block' : 'none';

    if (!isLoggedIn) return;

    const tbody = document.getElementById('orders-history-tbody');
    if (!tbody) return;

    const query = (document.getElementById('orders-search-input')?.value || '').toLowerCase().trim();
    const status = this.activeStatusFilter || 'all';

    const filtered = this.orders.filter(o => {
      const matchStatus = status === 'all' || o.status.toLowerCase().replace(' ', '-') === status.toLowerCase();
      const matchQuery = !query || o.id.toLowerCase().includes(query) || o.serviceName.toLowerCase().includes(query) || o.link.toLowerCase().includes(query);
      return matchStatus && matchQuery;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            No orders found matching this filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(o => {
      let badgeClass = 'active';
      if (o.status === 'In Progress') badgeClass = 'pending';
      if (o.status === 'Completed') badgeClass = 'active';

      return `
        <tr>
          <td style="font-family: var(--font-mono); font-weight: 700; color: var(--color-twitter);">${o.id}</td>
          <td>
            <span class="status-badge ${o.platform.toLowerCase()}">${o.platform}</span>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-primary); font-size: 0.86rem;">${o.serviceName}</div>
            <a href="${o.link}" target="_blank" style="font-size: 0.75rem; color: var(--text-muted); text-decoration: underline; word-break: break-all;">${o.link}</a>
          </td>
          <td style="font-family: var(--font-mono);">${o.quantity.toLocaleString()}</td>
          <td style="font-family: var(--font-mono); font-weight: 800; color: var(--color-emerald);">${o.charge}</td>
          <td>
            <span class="status-badge ${badgeClass}">${o.status}</span>
            ${o.status === 'In Progress' ? `
              <div style="margin-top: 0.35rem;">
                <button type="button" class="btn-action-primary" style="padding: 0.2rem 0.5rem; font-size: 0.68rem; width: 100%; white-space: nowrap;" onclick="window.ordersManager.simulateOrderCompletion('${o.id}')">
                  ⚡ Complete & Push Alert
                </button>
              </div>
            ` : ''}
          </td>
          <td style="font-size: 0.78rem; color: var(--text-muted);">${o.date}</td>
        </tr>
      `;
    }).join('');
  }

  simulateOrderCompletion(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;
    order.status = 'Completed';
    this.saveOrders();
    this.renderOrdersTable();
    window.dispatchEvent(new CustomEvent('order:completed', { detail: order }));
    window.toolkityApp?.showToast('Order Completed! ✅', `Order ${orderId} marked as Completed. Real-time Telegram notification dispatched!`, 'success');
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.ordersManager = new OrdersManager();
});
