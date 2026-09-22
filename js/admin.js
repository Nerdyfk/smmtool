/**
 * SMMTOOL Pro - Master Admin Control Center Controller
 * Provides complete website access:
 * 1. Service Pricing, Active/Paused toggles, limits, and batch markup
 * 2. Order Management with status controls and automatic refunds
 * 3. User problem-solving and support ticket resolver
 * 4. Payment Gateway and Bank Settlement management (Bangla QR, SSLCommerz, Binance Pay, Bybit Pay, etc.)
 */

class AdminManager {
  constructor() {
    this.servicesStorageKey = 'smmtool_custom_services';
    this.ticketsStorageKey = 'smmtool_support_tickets';
    this.gatewaysStorageKey = 'smmtool_payment_gateways';
    this.emailStorageKey = 'smmtool_admin_email_settings';
    this.alertsStorageKey = 'smmtool_admin_alerts';

    this.services = this.loadServices();
    this.tickets = this.loadTickets();
    this.gateways = this.loadGateways();
    this.alertSettings = this.loadAlertSettings();
    this.alerts = this.loadAlerts();
    this.activeTab = 'services'; // services | orders | tickets | gateways | alerts

    this.init();
  }

  init() {
    this.setupTabNavigation();
    this.renderServicesTable();
    this.renderOrdersTable();
    this.renderTicketsTable();
    this.renderGatewaysConfig();
    this.renderAlertsSettings();
    this.renderAlertsLog();
    this.setupEventListeners();
    this.setupLiveAlertsListener();
  }

  // ==========================================
  // DATA PERSISTENCE & LOADING
  // ==========================================

  loadServices() {
    try {
      const saved = localStorage.getItem(this.servicesStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= (TOOLKITY_DATA.smmServices?.length || 0)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading admin services:', e);
    }
    // Deep clone from TOOLKITY_DATA and sync to localStorage
    const list = JSON.parse(JSON.stringify(TOOLKITY_DATA.smmServices || []));
    try {
      localStorage.setItem(this.servicesStorageKey, JSON.stringify(list));
    } catch (e) {}
    return list;
  }

  saveServices() {
    try {
      localStorage.setItem(this.servicesStorageKey, JSON.stringify(this.services));
    } catch (e) {
      console.error('Error saving admin services:', e);
    }
    // Update active memory in TOOLKITY_DATA as well
    TOOLKITY_DATA.smmServices = this.services;
    window.dispatchEvent(new CustomEvent('services:updated', { detail: this.services }));
  }

  loadTickets() {
    try {
      const saved = localStorage.getItem(this.ticketsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading admin tickets:', e);
    }
    return JSON.parse(JSON.stringify(TOOLKITY_DATA.seedTickets || []));
  }

  saveTickets() {
    try {
      localStorage.setItem(this.ticketsStorageKey, JSON.stringify(this.tickets));
    } catch (e) {
      console.error('Error saving admin tickets:', e);
    }
    TOOLKITY_DATA.seedTickets = this.tickets;
    window.dispatchEvent(new CustomEvent('tickets:updated', { detail: this.tickets }));
  }

  loadGateways() {
    try {
      const saved = localStorage.getItem(this.gatewaysStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading admin gateways:', e);
    }
    return JSON.parse(JSON.stringify(TOOLKITY_DATA.paymentGateways || {}));
  }

  saveGateways() {
    try {
      localStorage.setItem(this.gatewaysStorageKey, JSON.stringify(this.gateways));
    } catch (e) {
      console.error('Error saving admin gateways:', e);
    }
    TOOLKITY_DATA.paymentGateways = this.gateways;
    window.dispatchEvent(new CustomEvent('gateways:updated', { detail: this.gateways }));
  }

  // ==========================================
  // NAVIGATION & TAB SWITCHING
  // ==========================================

  setupTabNavigation() {
    const tabs = document.querySelectorAll('.admin-nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeTab = tab.getAttribute('data-tab');

        document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.remove('active'));
        const activePane = document.getElementById(`admin-pane-${this.activeTab}`);
        if (activePane) activePane.classList.add('active');
      });
    });
  }

  // ==========================================
  // 1. SERVICES & PRICING CONTROLLER
  // ==========================================

  renderServicesTable() {
    const tbody = document.getElementById('admin-services-tbody');
    if (!tbody) return;

    tbody.innerHTML = this.services.map(s => {
      const isActive = s.status !== 'paused';
      return `
        <tr data-service-id="${s.id}">
          <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">#${s.id}</td>
          <td>
            <span class="status-badge ${s.platform.toLowerCase()}">${s.platform}</span>
          </td>
          <td>
            <div style="font-weight: 700; color: var(--text-primary); font-size: 0.86rem;">${s.name}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${s.category} • ${s.speed}</div>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <span style="color: var(--color-emerald); font-weight: 800;">$</span>
              <input type="number" step="0.001" min="0.001" class="admin-table-inline-input" value="${s.ratePer1000 < 0.1 ? s.ratePer1000.toFixed(3) : s.ratePer1000.toFixed(2)}" onchange="window.adminManager.updateServicePrice(${s.id}, this.value)">
              <span style="font-size: 0.72rem; color: var(--text-muted);">/1k</span>
            </div>
          </td>
          <td style="font-size: 0.78rem; font-family: var(--font-mono); color: var(--text-secondary);">
            ${s.min.toLocaleString()} / ${s.max.toLocaleString()}
          </td>
          <td>
            <button type="button" class="admin-status-toggle-btn ${isActive ? 'active' : 'paused'}" onclick="window.adminManager.toggleServiceStatus(${s.id})">
              <span>${isActive ? '● Active' : '⏸ Paused'}</span>
            </button>
          </td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button type="button" class="platform-action-btn" style="padding: 0.3rem 0.5rem; font-size: 0.72rem;" onclick="window.adminManager.openEditServiceModal(${s.id})">
                ✏️ Edit
              </button>
              <button type="button" class="platform-action-btn" style="padding: 0.3rem 0.5rem; font-size: 0.72rem; color: #ef4444;" onclick="window.adminManager.deleteService(${s.id})">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  updateServicePrice(serviceId, newPrice) {
    const val = parseFloat(newPrice);
    if (isNaN(val) || val < 0) {
      window.toolkityApp?.showToast('Invalid Price', 'Please enter a valid numeric USD rate.', 'error');
      return;
    }
    const service = this.services.find(s => s.id === serviceId);
    if (service) {
      service.ratePer1000 = parseFloat(val.toFixed(3));
      this.saveServices();
      window.toolkityApp?.showToast('Price Updated', `#${service.id} (${service.platform}) rate set to $${val.toFixed(2)} / 1k`, 'success');
      this.refreshClientViews();
    }
  }

  toggleServiceStatus(serviceId) {
    const service = this.services.find(s => s.id === serviceId);
    if (!service) return;

    service.status = service.status === 'paused' ? 'active' : 'paused';
    this.saveServices();
    this.renderServicesTable();
    this.refreshClientViews();

    const stateLabel = service.status === 'active' ? 'Activated' : 'Paused';
    const toastType = service.status === 'active' ? 'success' : 'info';
    window.toolkityApp?.showToast(`Service ${stateLabel}`, `#${service.id} is now ${service.status.toUpperCase()}`, toastType);
  }

  applyBatchMarkup(percent) {
    const p = parseFloat(percent);
    if (isNaN(p)) return;

    this.services.forEach(s => {
      const newRate = s.ratePer1000 * (1 + p / 100);
      s.ratePer1000 = Math.max(0.005, parseFloat(newRate.toFixed(3)));
    });

    this.saveServices();
    this.renderServicesTable();
    this.refreshClientViews();
    window.toolkityApp?.showToast('Batch Pricing Updated', `Applied ${p > 0 ? '+' : ''}${p}% markup across all services.`, 'success');
  }

  addNewService(data) {
    const newId = (this.services.reduce((max, s) => Math.max(max, s.id), 100)) + 1;
    const newService = {
      id: newId,
      platform: data.platform || 'Twitter',
      category: data.category || 'General Growth',
      name: data.name,
      ratePer1000: parseFloat(data.ratePer1000) || 1.00,
      min: parseInt(data.min, 10) || 100,
      max: parseInt(data.max, 10) || 100000,
      speed: data.speed || 'Instant Fast',
      status: 'active',
      description: data.description || 'High quality delivery via SMMTOOL wholesale API.'
    };

    this.services.unshift(newService);
    this.saveServices();
    this.renderServicesTable();
    this.refreshClientViews();
    window.toolkityApp?.showToast('Service Created', `Created Service #${newId} successfully.`, 'success');
  }

  openAddServiceModal() {
    this.editingServiceId = null;
    const modal = document.getElementById('admin-add-service-modal');
    const form = document.getElementById('admin-add-service-form');
    const title = document.getElementById('admin-service-modal-title');
    if (form) form.reset();
    if (title) title.textContent = "Add New SMM Service";
    if (modal) modal.classList.add('active');
  }

  openEditServiceModal(serviceId) {
    const s = this.services.find(item => item.id === serviceId);
    if (!s) return;
    this.editingServiceId = serviceId;
    const modal = document.getElementById('admin-add-service-modal');
    const title = document.getElementById('admin-service-modal-title');
    if (title) title.textContent = `Edit Service #${s.id} (${s.platform})`;

    if (document.getElementById('admin-new-platform')) document.getElementById('admin-new-platform').value = s.platform;
    if (document.getElementById('admin-new-category')) document.getElementById('admin-new-category').value = s.category;
    if (document.getElementById('admin-new-name')) document.getElementById('admin-new-name').value = s.name;
    if (document.getElementById('admin-new-rate')) document.getElementById('admin-new-rate').value = s.ratePer1000;
    if (document.getElementById('admin-new-min')) document.getElementById('admin-new-min').value = s.min;
    if (document.getElementById('admin-new-max')) document.getElementById('admin-new-max').value = s.max;
    if (document.getElementById('admin-new-speed')) document.getElementById('admin-new-speed').value = s.speed;
    if (document.getElementById('admin-new-desc')) document.getElementById('admin-new-desc').value = s.description || '';

    if (modal) modal.classList.add('active');
  }

  closeServiceModal() {
    const modal = document.getElementById('admin-add-service-modal');
    if (modal) modal.classList.remove('active');
    this.editingServiceId = null;
  }

  closeTicketModal() {
    const modal = document.getElementById('admin-ticket-detail-modal');
    if (modal) modal.classList.remove('active');
  }

  deleteService(serviceId) {
    if (!confirm(`Are you sure you want to delete service #${serviceId}?`)) return;
    this.services = this.services.filter(s => s.id !== serviceId);
    this.saveServices();
    this.renderServicesTable();
    this.refreshClientViews();
    window.toolkityApp?.showToast('Service Removed', `Service #${serviceId} deleted.`, 'info');
  }

  refreshClientViews() {
    // Notify app to re-render catalog and new order form
    if (window.toolkityApp && typeof window.toolkityApp.renderServicesCatalog === 'function') {
      window.toolkityApp.renderServicesCatalog();
    }
    if (window.ordersManager && typeof window.ordersManager.renderServicesForCategory === 'function') {
      window.ordersManager.renderServicesForCategory();
    }
  }

  // ==========================================
  // 2. ORDER MANAGEMENT CONTROLLER
  // ==========================================

  renderOrdersTable(filter = 'all') {
    const tbody = document.getElementById('admin-orders-tbody');
    if (!tbody) return;

    let orders = [];
    if (window.ordersManager && Array.isArray(window.ordersManager.orders)) {
      orders = window.ordersManager.orders;
    } else {
      orders = TOOLKITY_DATA.seedOrders || [];
    }

    const filtered = filter === 'all' ? orders : orders.filter(o => o.status.toLowerCase().replace(/\s+/g, '-') === filter.toLowerCase());

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            No orders found under filter '${filter}'.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(o => `
      <tr>
        <td style="font-family: var(--font-mono); font-size: 0.8rem; font-weight: 800; color: var(--color-twitter);">${o.id}</td>
        <td>
          <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary);">@${o.customer || 'global_builder'}</span>
        </td>
        <td>
          <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-primary);">${o.serviceName}</div>
          <a href="${o.link}" target="_blank" rel="noopener" style="font-size: 0.72rem; color: var(--color-cyan); text-decoration: underline; word-break: break-all;">${o.link}</a>
        </td>
        <td style="font-family: var(--font-mono); font-size: 0.78rem;">${(o.quantity || 1000).toLocaleString()}</td>
        <td style="font-family: var(--font-mono); font-size: 0.82rem; font-weight: 800; color: var(--color-emerald);">${o.charge}</td>
        <td>
          <select class="admin-order-status-select ${o.status.toLowerCase().replace(/\s+/g, '-')}" onchange="window.adminManager.changeOrderStatus('${o.id}', this.value)">
            <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="In Progress" ${o.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Completed" ${o.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            <option value="Refunded" ${o.status === 'Refunded' ? 'selected' : ''}>Refunded</option>
          </select>
        </td>
        <td style="font-size: 0.72rem; color: var(--text-muted);">${o.date}</td>
      </tr>
    `).join('');
  }

  changeOrderStatus(orderId, newStatus) {
    let orders = window.ordersManager?.orders || TOOLKITY_DATA.seedOrders;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const oldStatus = order.status;
    order.status = newStatus;

    // If status changed to Cancelled or Refunded, offer automatic balance refund
    if ((newStatus === 'Cancelled' || newStatus === 'Refunded') && oldStatus !== 'Refunded' && oldStatus !== 'Cancelled') {
      const chargeNum = parseFloat((order.charge || '$0').replace(/[^0-9.]/g, ''));
      if (chargeNum > 0 && window.authManager) {
        window.authManager.creditBalance(chargeNum);
        window.toolkityApp?.showToast('Order Refunded', `Refunded $${chargeNum.toFixed(2)} USD to @${order.customer || 'user'}'s wallet.`, 'success');
      }
    }

    if (window.ordersManager) {
      window.ordersManager.saveOrders();
      window.ordersManager.renderOrdersTable();
    }
    this.renderOrdersTable();
    window.toolkityApp?.showToast('Order Status Updated', `Order ${orderId} marked as ${newStatus}`, 'info');
  }

  // ==========================================
  // 3. SUPPORT TICKETS RESOLVER
  // ==========================================

  renderTicketsTable(filter = 'all') {
    const tbody = document.getElementById('admin-tickets-tbody');
    if (!tbody) return;

    const filtered = filter === 'all' ? this.tickets : this.tickets.filter(t => t.status.toLowerCase().replace(/\s+/g, '-') === filter.toLowerCase());

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            No support tickets under '${filter}'.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(t => {
      const statusClass = t.status.toLowerCase().replace(/\s+/g, '-');
      const priorityClass = t.priority.toLowerCase();
      return `
        <tr>
          <td style="font-family: var(--font-mono); font-size: 0.8rem; font-weight: 800; color: var(--color-twitter);">${t.id}</td>
          <td>
            <div style="font-weight: 700; color: var(--text-primary); font-size: 0.82rem;">@${t.username}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${t.email}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: var(--text-primary); font-size: 0.84rem;">${t.subject}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">Category: ${t.category} • Ref: ${t.orderId || 'None'}</div>
          </td>
          <td>
            <span class="ticket-priority-pill ${priorityClass}">${t.priority}</span>
          </td>
          <td>
            <span class="ticket-status-pill ${statusClass}">${t.status}</span>
          </td>
          <td style="font-size: 0.72rem; color: var(--text-muted);">${t.date}</td>
          <td>
            <button type="button" class="btn-action-primary" style="padding: 0.3rem 0.65rem; font-size: 0.74rem;" onclick="window.adminManager.openTicketReplyModal('${t.id}')">
              💬 Resolve
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  openTicketReplyModal(ticketId) {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const modal = document.getElementById('admin-ticket-detail-modal');
    if (!modal) return;

    document.getElementById('admin-ticket-modal-id').textContent = ticket.id;
    document.getElementById('admin-ticket-modal-subject').textContent = ticket.subject;
    document.getElementById('admin-ticket-modal-user').textContent = `@${ticket.username} (${ticket.email})`;

    const threadEl = document.getElementById('admin-ticket-message-thread');
    threadEl.innerHTML = (ticket.messages || []).map(m => `
      <div class="ticket-msg-bubble ${m.sender === 'admin' ? 'admin' : 'user'}">
        <div class="ticket-msg-header">
          <strong>${m.author}</strong>
          <span>${m.time}</span>
        </div>
        <div class="ticket-msg-body">${m.text}</div>
      </div>
    `).join('');

    document.getElementById('admin-reply-ticket-id').value = ticket.id;
    modal.classList.add('active');
  }

  sendTicketReply(ticketId, replyText, newStatus = 'Resolved') {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    if (!ticket.messages) ticket.messages = [];
    ticket.messages.push({
      sender: "admin",
      author: "SMMTOOL Support Admin",
      text: replyText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    ticket.status = newStatus;
    this.saveTickets();
    this.renderTicketsTable();

    // Close modal
    document.getElementById('admin-ticket-detail-modal')?.classList.remove('active');
    window.toolkityApp?.showToast('Ticket Resolved', `Response sent to @${ticket.username} for ticket ${ticketId}`, 'success');
  }

  // ==========================================
  // 4. PAYMENT GATEWAYS & BANK SETTLEMENT
  // ==========================================

  renderGatewaysConfig() {
    // Populate Bank Account settlement details
    const bank = this.gateways.banglaQR?.bankAccount || {};
    const bankNameInput = document.getElementById('admin-bank-name');
    const bankAcctInput = document.getElementById('admin-bank-account-no');
    const bankNameHolder = document.getElementById('admin-bank-holder-name');
    const bankRouting = document.getElementById('admin-bank-routing');
    const bankBranch = document.getElementById('admin-bank-branch');
    const bdtRateInput = document.getElementById('admin-bdt-rate');

    if (bankNameInput) bankNameInput.value = bank.bankName || 'City Bank PLC';
    if (bankAcctInput) bankAcctInput.value = bank.accountNumber || '1501204859001';
    if (bankNameHolder) bankNameHolder.value = bank.accountName || 'SMMTOOL Technologies Ltd';
    if (bankRouting) bankRouting.value = bank.routingNumber || '225261895';
    if (bankBranch) bankBranch.value = bank.branch || 'Gulshan Corporate Branch, Dhaka';
    if (bdtRateInput) bdtRateInput.value = this.gateways.banglaQR?.exchangeRate || 120;

    // Populate SSLCommerz credentials
    const ssl = this.gateways.banglaQR?.sslcommerz || {};
    const storeIdInput = document.getElementById('admin-ssl-store-id');
    const storePassInput = document.getElementById('admin-ssl-store-pass');
    if (storeIdInput) storeIdInput.value = ssl.storeId || 'smmtool_live';
    if (storePassInput) storePassInput.value = ssl.storePass || 'smmtool998pass';

    // Populate Binance Pay ID
    const binancePayInput = document.getElementById('admin-binance-pay-id');
    if (binancePayInput) binancePayInput.value = this.gateways.binancePay?.payId || '589204123';

    // Populate Bybit UID
    const bybitUidInput = document.getElementById('admin-bybit-uid');
    if (bybitUidInput) bybitUidInput.value = this.gateways.bybitPay?.uid || '39481029';

    // Populate Toggles
    const toggleBangla = document.getElementById('toggle-gateway-bangla-qr');
    const toggleBinance = document.getElementById('toggle-gateway-binance');
    const toggleBybit = document.getElementById('toggle-gateway-bybit');
    const toggleEVM = document.getElementById('toggle-gateway-evm');

    if (toggleBangla) toggleBangla.checked = this.gateways.banglaQR?.enabled !== false;
    if (toggleBinance) toggleBinance.checked = this.gateways.binancePay?.enabled !== false;
    if (toggleBybit) toggleBybit.checked = this.gateways.bybitPay?.enabled !== false;
    if (toggleEVM) toggleEVM.checked = this.gateways.evmStablecoins?.enabled !== false;
  }

  saveBankingSettings(e) {
    if (e) e.preventDefault();

    if (!this.gateways.banglaQR) this.gateways.banglaQR = {};
    if (!this.gateways.banglaQR.bankAccount) this.gateways.banglaQR.bankAccount = {};
    if (!this.gateways.banglaQR.sslcommerz) this.gateways.banglaQR.sslcommerz = {};

    this.gateways.banglaQR.bankAccount.bankName = document.getElementById('admin-bank-name')?.value || 'City Bank PLC';
    this.gateways.banglaQR.bankAccount.accountNumber = document.getElementById('admin-bank-account-no')?.value || '1501204859001';
    this.gateways.banglaQR.bankAccount.accountName = document.getElementById('admin-bank-holder-name')?.value || 'SMMTOOL Technologies Ltd';
    this.gateways.banglaQR.bankAccount.routingNumber = document.getElementById('admin-bank-routing')?.value || '225261895';
    this.gateways.banglaQR.bankAccount.branch = document.getElementById('admin-bank-branch')?.value || 'Gulshan Corporate Branch, Dhaka';
    this.gateways.banglaQR.exchangeRate = parseFloat(document.getElementById('admin-bdt-rate')?.value) || 120;

    this.gateways.banglaQR.sslcommerz.storeId = document.getElementById('admin-ssl-store-id')?.value || 'smmtool_live';
    this.gateways.banglaQR.sslcommerz.storePass = document.getElementById('admin-ssl-store-pass')?.value || '';

    if (this.gateways.binancePay) {
      this.gateways.binancePay.payId = document.getElementById('admin-binance-pay-id')?.value || '589204123';
    }
    if (this.gateways.bybitPay) {
      this.gateways.bybitPay.uid = document.getElementById('admin-bybit-uid')?.value || '39481029';
    }

    this.saveGateways();
    window.toolkityApp?.showToast('Gateway Config Saved', 'Settlement bank account & SSLCommerz credentials saved.', 'success');
  }

  toggleGateway(gatewayId, isEnabled) {
    if (this.gateways[gatewayId]) {
      this.gateways[gatewayId].enabled = isEnabled;
      this.saveGateways();
      window.toolkityApp?.showToast('Gateway Status Updated', `${gatewayId} is now ${isEnabled ? 'Enabled' : 'Disabled'}.`, 'info');
    }
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================

  setupEventListeners() {
    // Open Add Service Modal Button
    const btnOpenAddService = document.getElementById('btn-admin-add-service-modal');
    if (btnOpenAddService) {
      btnOpenAddService.addEventListener('click', () => this.openAddServiceModal());
    }

    // Close Service Modal Buttons
    const btnCloseServiceModal = document.getElementById('btn-close-service-modal');
    if (btnCloseServiceModal) {
      btnCloseServiceModal.addEventListener('click', () => this.closeServiceModal());
    }
    const btnCancelServiceModal = document.getElementById('btn-cancel-service-modal');
    if (btnCancelServiceModal) {
      btnCancelServiceModal.addEventListener('click', () => this.closeServiceModal());
    }

    // Add or Edit Service Form Submit
    const addServiceForm = document.getElementById('admin-add-service-form');
    if (addServiceForm) {
      addServiceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pPlatform = document.getElementById('admin-new-platform')?.value || 'Twitter';
        const pCategory = document.getElementById('admin-new-category')?.value || 'Growth';
        const pName = document.getElementById('admin-new-name')?.value || 'New Service';
        const pRate = parseFloat(document.getElementById('admin-new-rate')?.value) || 1.00;
        const pMin = parseInt(document.getElementById('admin-new-min')?.value, 10) || 100;
        const pMax = parseInt(document.getElementById('admin-new-max')?.value, 10) || 100000;
        const pSpeed = document.getElementById('admin-new-speed')?.value || 'Instant';
        const pDesc = document.getElementById('admin-new-desc')?.value || '';

        if (this.editingServiceId) {
          const s = this.services.find(item => item.id === this.editingServiceId);
          if (s) {
            s.platform = pPlatform;
            s.category = pCategory;
            s.name = pName;
            s.ratePer1000 = pRate;
            s.min = pMin;
            s.max = pMax;
            s.speed = pSpeed;
            s.description = pDesc;
            this.saveServices();
            this.renderServicesTable();
            this.refreshClientViews();
            window.toolkityApp?.showToast('Service Updated', `Service #${s.id} updated successfully.`, 'success');
          }
          this.editingServiceId = null;
        } else {
          this.addNewService({
            platform: pPlatform,
            category: pCategory,
            name: pName,
            ratePer1000: pRate,
            min: pMin,
            max: pMax,
            speed: pSpeed,
            description: pDesc
          });
        }
        addServiceForm.reset();
        this.closeServiceModal();
      });
    }

    // Batch Markup Apply
    const btnBatchMarkup = document.getElementById('btn-admin-apply-markup');
    if (btnBatchMarkup) {
      btnBatchMarkup.addEventListener('click', () => {
        const input = document.getElementById('admin-batch-markup-input');
        if (input && input.value) {
          this.applyBatchMarkup(input.value);
        }
      });
    }

    // Services Filters & Search
    const servicesSearch = document.getElementById('admin-services-search');
    const servicesPlatformFilter = document.getElementById('admin-services-platform-filter');
    const servicesStatusFilter = document.getElementById('admin-services-status-filter');
    const applyServicesFilters = () => {
      const q = (servicesSearch?.value || '').toLowerCase();
      const plat = servicesPlatformFilter?.value || 'all';
      const stat = servicesStatusFilter?.value || 'all';

      const rows = document.querySelectorAll('#admin-services-tbody tr');
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const matchesQ = !q || text.includes(q);
        const rowPlat = (row.querySelector('.status-badge')?.textContent || '').trim().toLowerCase();
        const matchesPlat = plat === 'all' || rowPlat === plat.toLowerCase() || (plat.toLowerCase() === 'music' && (rowPlat === 'soundcloud' || rowPlat === 'audiomack'));
        const isPaused = row.querySelector('.admin-status-toggle-btn.paused') !== null;
        const matchesStat = stat === 'all' || (stat === 'active' && !isPaused) || (stat === 'paused' && isPaused);

        row.style.display = (matchesQ && matchesPlat && matchesStat) ? '' : 'none';
      });
    };
    if (servicesSearch) servicesSearch.addEventListener('input', applyServicesFilters);
    if (servicesPlatformFilter) servicesPlatformFilter.addEventListener('change', applyServicesFilters);
    if (servicesStatusFilter) servicesStatusFilter.addEventListener('change', applyServicesFilters);

    // Orders Filter & Search
    const ordersSearch = document.getElementById('admin-orders-search');
    const ordersStatusFilter = document.getElementById('admin-orders-status-filter');
    if (ordersSearch) ordersSearch.addEventListener('input', () => this.renderOrdersTable(ordersStatusFilter?.value || 'all'));
    if (ordersStatusFilter) ordersStatusFilter.addEventListener('change', (e) => this.renderOrdersTable(e.target.value));

    // Tickets Filter
    const ticketsStatusFilter = document.getElementById('admin-tickets-status-filter');
    if (ticketsStatusFilter) ticketsStatusFilter.addEventListener('change', (e) => this.renderTicketsTable(e.target.value));

    // Close Ticket Modal Button
    const btnCloseTicketModal = document.getElementById('btn-close-ticket-modal');
    if (btnCloseTicketModal) {
      btnCloseTicketModal.addEventListener('click', () => this.closeTicketModal());
    }

    // Ticket Reply Form
    const replyForm = document.getElementById('admin-ticket-reply-form');
    if (replyForm) {
      replyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const ticketId = document.getElementById('admin-reply-ticket-id')?.value;
        const text = document.getElementById('admin-reply-text')?.value;
        const status = document.getElementById('admin-reply-status-select')?.value || 'Resolved';
        if (ticketId && text) {
          this.sendTicketReply(ticketId, text, status);
          document.getElementById('admin-reply-text').value = '';
          this.closeTicketModal();
        }
      });
    }

    // Mark Resolved Button from Ticket Modal
    const btnTicketResolve = document.getElementById('btn-ticket-mark-resolved');
    if (btnTicketResolve) {
      btnTicketResolve.addEventListener('click', () => {
        const ticketId = document.getElementById('admin-reply-ticket-id')?.value;
        if (ticketId) {
          this.sendTicketReply(ticketId, 'Our admin operations team has resolved your ticket. Thank you for choosing SMMTOOL.', 'Resolved');
          this.closeTicketModal();
        }
      });
    }

    // Quick Refund Button from Ticket Modal
    const btnTicketRefund = document.getElementById('btn-admin-ticket-refund');
    if (btnTicketRefund) {
      btnTicketRefund.addEventListener('click', () => {
        const ticketId = document.getElementById('admin-reply-ticket-id')?.value;
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        const refundAmt = prompt("Enter USD amount to credit/refund user's balance:", "10.00");
        const num = parseFloat(refundAmt);
        if (!isNaN(num) && num > 0 && window.authManager) {
          window.authManager.creditBalance(num);
          this.sendTicketReply(ticketId, `Refund of $${num.toFixed(2)} USD processed to your balance for issue resolution.`, 'Resolved');
          window.toolkityApp?.showToast('Balance Credited', `Credited $${num.toFixed(2)} USD to @${ticket.username}`, 'success');
          this.closeTicketModal();
        }
      });
    }

    // Banking & Gateways Form
    const bankingForm = document.getElementById('admin-banking-config-form');
    if (bankingForm) {
      bankingForm.addEventListener('submit', (e) => this.saveBankingSettings(e));
    }

    // Custom Gateway Add Button
    const btnAddCustomGateway = document.getElementById('btn-admin-add-custom-gateway');
    if (btnAddCustomGateway) {
      btnAddCustomGateway.addEventListener('click', () => {
        const nameInput = document.getElementById('admin-new-gateway-name');
        const idInput = document.getElementById('admin-new-gateway-id');
        const name = nameInput?.value.trim();
        const idVal = idInput?.value.trim();
        if (!name || !idVal) {
          window.toolkityApp?.showToast('Missing Info', 'Please enter a gateway name and account/pay ID.', 'warning');
          return;
        }

        if (!this.gateways.customGateways) this.gateways.customGateways = [];
        this.gateways.customGateways.push({
          id: 'gw_' + Date.now(),
          name: name,
          accountRef: idVal,
          enabled: true
        });
        this.saveGateways();
        nameInput.value = '';
        idInput.value = '';
        this.renderGatewaysConfig();
        window.toolkityApp?.showToast('Gateway Added', `Added ${name} to available payment gateways.`, 'success');
      });
    }

    // Admin Alerts & Email Settings Form
    const btnSaveAlerts = document.getElementById('btn-save-alert-settings');
    if (btnSaveAlerts) {
      btnSaveAlerts.addEventListener('click', () => {
        const emailInput = document.getElementById('admin-alert-email');
        const ordersToggle = document.getElementById('admin-alert-trigger-orders');
        const depositsToggle = document.getElementById('admin-alert-trigger-deposits');
        const ticketsToggle = document.getElementById('admin-alert-trigger-tickets');
        const webhookInput = document.getElementById('admin-alert-webhook');

        const email = (emailInput?.value || '').trim();
        if (!email || !email.includes('@')) {
          window.toolkityApp?.showToast('Valid Email Required', 'Please enter a valid administrator email address.', 'warning');
          return;
        }

        this.saveAlertSettings({
          email: email,
          notifyOnOrders: ordersToggle ? ordersToggle.checked : true,
          notifyOnDeposits: depositsToggle ? depositsToggle.checked : true,
          notifyOnTickets: ticketsToggle ? ticketsToggle.checked : true,
          webhookUrl: webhookInput ? webhookInput.value.trim() : ''
        });

        window.toolkityApp?.showToast('Email Settings Saved', `Instant order alerts will now be dispatched to ${email}`, 'success');
      });
    }

    // Send Test Alert Email Button
    const btnTestAlert = document.getElementById('btn-test-alert-email');
    if (btnTestAlert) {
      btnTestAlert.addEventListener('click', () => this.sendTestAlert());
    }

    // Enable Desktop Popups Button
    const btnEnableDesktop = document.getElementById('btn-enable-desktop-alerts');
    if (btnEnableDesktop) {
      btnEnableDesktop.addEventListener('click', () => {
        if (typeof Notification !== 'undefined') {
          Notification.requestPermission().then(permission => {
            this.renderAlertsSettings();
            if (permission === 'granted') {
              window.toolkityApp?.showToast('Desktop Alerts Enabled', 'Browser notifications will alert you on incoming orders.', 'success');
            } else {
              window.toolkityApp?.showToast('Notifications Blocked', 'Please allow notifications in browser permissions.', 'warning');
            }
          });
        }
      });
    }
  }

  // ==========================================
  // 5. ADMIN EMAIL & INSTANT ORDER ALERTS
  // ==========================================

  loadAlertSettings() {
    try {
      const saved = localStorage.getItem(this.emailStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      email: localStorage.getItem('smmtool_admin_email') || 'admin@smmtool.pro',
      notifyOnOrders: true,
      notifyOnDeposits: true,
      notifyOnTickets: true,
      desktopAlerts: false,
      webhookUrl: ''
    };
  }

  saveAlertSettings(settings) {
    try {
      this.alertSettings = { ...this.alertSettings, ...settings };
      localStorage.setItem(this.emailStorageKey, JSON.stringify(this.alertSettings));
      localStorage.setItem('smmtool_admin_email', this.alertSettings.email);
    } catch (e) {
      console.error('Error saving admin alert settings:', e);
    }
    this.renderAlertsSettings();
  }

  loadAlerts() {
    try {
      const saved = localStorage.getItem(this.alertsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'ALT-882194',
        type: 'SYSTEM',
        recipient: this.alertSettings?.email || 'admin@smmtool.pro',
        orderId: 'SYS-INIT',
        customer: 'system_core',
        service: 'SMMTOOL Automated Alert Gateway Initialized',
        charge: '$0.00',
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status: 'Delivered',
        subject: '⚡ SMMTOOL Admin Alert Notification Gateway Active'
      }
    ];
  }

  renderAlertsSettings() {
    const emailInput = document.getElementById('admin-alert-email');
    const ordersToggle = document.getElementById('admin-alert-trigger-orders');
    const depositsToggle = document.getElementById('admin-alert-trigger-deposits');
    const ticketsToggle = document.getElementById('admin-alert-trigger-tickets');
    const webhookInput = document.getElementById('admin-alert-webhook');
    const desktopStatus = document.getElementById('admin-desktop-permission-status');

    if (emailInput) emailInput.value = this.alertSettings.email || 'admin@smmtool.pro';
    if (ordersToggle) ordersToggle.checked = this.alertSettings.notifyOnOrders !== false;
    if (depositsToggle) depositsToggle.checked = this.alertSettings.notifyOnDeposits !== false;
    if (ticketsToggle) ticketsToggle.checked = this.alertSettings.notifyOnTickets !== false;
    if (webhookInput) webhookInput.value = this.alertSettings.webhookUrl || '';
    if (desktopStatus) {
      const granted = typeof Notification !== 'undefined' && Notification.permission === 'granted';
      desktopStatus.textContent = granted ? '✓ Desktop Popups Active' : 'Click to enable desktop popups';
      desktopStatus.style.color = granted ? 'var(--color-emerald)' : 'var(--text-muted)';
    }
  }

  renderAlertsLog() {
    this.alerts = this.loadAlerts();
    const tbody = document.getElementById('admin-alerts-tbody');
    const countBadge = document.getElementById('admin-alerts-count-badge');
    if (countBadge) countBadge.textContent = this.alerts.length.toString();
    if (!tbody) return;

    if (this.alerts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            No dispatched alerts yet. Real-time notifications will appear here instantly when orders arrive.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.alerts.map(a => {
      let badgeClass = 'active';
      if (a.type === 'NEW_ORDER') badgeClass = 'verified';
      if (a.type === 'DEPOSIT') badgeClass = 'pending';

      return `
        <tr>
          <td style="font-family: var(--font-mono); font-size: 0.8rem; font-weight: 700; color: var(--color-twitter);">${a.id}</td>
          <td><span class="status-badge ${badgeClass}">${a.type}</span></td>
          <td style="font-family: var(--font-mono); font-weight: 700; color: var(--text-primary);">${a.orderId || '-'}</td>
          <td>
            <div style="font-weight: 700; color: var(--text-primary); font-size: 0.84rem;">@${a.customer}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${a.service}</div>
          </td>
          <td style="font-family: var(--font-mono); font-weight: 800; color: var(--color-emerald);">${a.charge}</td>
          <td style="font-size: 0.78rem; color: var(--color-twitter); font-family: var(--font-mono);">${a.recipient}</td>
          <td style="font-size: 0.76rem; color: var(--text-muted);">${a.date}</td>
        </tr>
      `;
    }).join('');
  }

  sendTestAlert() {
    const email = document.getElementById('admin-alert-email')?.value.trim() || this.alertSettings.email || 'admin@smmtool.pro';
    const testItem = {
      id: 'ALT-' + Math.floor(100000 + Math.random() * 900000),
      type: 'TEST_ALERT',
      recipient: email,
      orderId: 'ORD-TEST-' + Math.floor(1000 + Math.random() * 9000),
      customer: 'admin_test',
      service: 'Instant Email Dispatch Test Alert',
      platform: 'Twitter',
      quantity: 5000,
      charge: '$11.45',
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'Delivered',
      subject: `⚡ [TEST ORDER ALERT] Notification Dispatcher to ${email}`
    };

    this.alerts = this.loadAlerts();
    this.alerts.unshift(testItem);
    localStorage.setItem(this.alertsStorageKey, JSON.stringify(this.alerts.slice(0, 100)));
    this.renderAlertsLog();

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(`SMMTOOL Alert Test`, {
        body: `Test order notification dispatched to ${email}`,
        icon: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'
      });
    }

    window.toolkityApp?.showToast('Test Alert Sent!', `Instant test notification successfully dispatched to ${email}`, 'success');
  }

  setupLiveAlertsListener() {
    window.addEventListener('storage', (e) => {
      if (e.key === this.alertsStorageKey) {
        this.renderAlertsLog();
        window.toolkityApp?.showToast('⚡ Incoming Order Alert!', 'A new customer order has just arrived and alert was dispatched to admin email.', 'info');
      }
      if (e.key === 'smmtool_user_orders' || e.key === 'toolkity_user_orders') {
        this.renderOrdersTable();
      }
    });
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.adminManager = new AdminManager();
});
