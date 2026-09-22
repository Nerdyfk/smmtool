/**
 * SMMTOOL Pro — Orders Controller (API-backed)
 * Powers dynamic category/service selection, real-time USD cost calculation,
 * API-based order placement with server-side balance deduction, and live order tracking.
 */

class OrdersManager {
  constructor() {
    this.orders = [];
    this.services = [];
    this.selectedCategory = 'twitter';
    this.selectedServiceId = null;
    this.quantity = 1000;

    this.init();
  }

  async init() {
    await this.loadServices();
    await this.loadOrders();
    this.setupNewOrderForm();
    this.setupOrderHistoryView();

    window.addEventListener('auth:updated', () => {
      this.updateBalanceIndicator();
    });

    window.addEventListener('services:updated', () => {
      this.loadServices().then(() => this.populateServicesForCategory());
    });
  }

  /**
   * Load services from API
   */
  async loadServices() {
    try {
      const data = await window.smmAPI.getServices();
      if (data && data.services) {
        this.services = data.services;
        // Also update TOOLKITY_DATA for backward compatibility
        if (window.TOOLKITY_DATA) {
          window.TOOLKITY_DATA.smmServices = this.services.map(s => ({
            id: s.serviceId,
            platform: s.platform,
            category: s.category,
            name: s.name,
            description: s.description,
            ratePer1000: s.ratePer1k,
            ratePer1k: s.ratePer1k,
            min: s.minOrder,
            max: s.maxOrder,
            minOrder: s.minOrder,
            maxOrder: s.maxOrder,
            speed: s.speed,
            status: s.status,
            quality: s.quality,
            refillDays: s.refillDays
          }));
        }
      }
    } catch (e) {
      console.warn('[SMMTOOL] Failed to load services from API, using local data:', e.message);
      // Fallback to TOOLKITY_DATA
      if (window.TOOLKITY_DATA && window.TOOLKITY_DATA.smmServices) {
        this.services = window.TOOLKITY_DATA.smmServices;
      }
    }
  }

  /**
   * Load user's orders from API
   */
  async loadOrders() {
    if (!window.smmAPI || !window.smmAPI.isLoggedIn()) {
      this.orders = [];
      return;
    }

    try {
      const data = await window.smmAPI.getOrders();
      if (data && data.orders) {
        this.orders = data.orders.map(o => ({
          id: o.orderId,
          customer: o.customerUsername,
          serviceName: o.serviceName,
          platform: o.platform,
          link: o.targetLink,
          quantity: o.quantity,
          charge: `$${o.charge.toFixed(2)}`,
          status: o.status,
          date: new Date(o.createdAt).toISOString().replace('T', ' ').substring(0, 16)
        }));
      }
    } catch (e) {
      console.warn('[SMMTOOL] Failed to load orders from API:', e.message);
      this.orders = [];
    }
  }

  getServicesList() {
    // Return services in the format expected by the UI
    if (this.services.length > 0) {
      return this.services.map(s => ({
        id: s.serviceId || s.id,
        platform: s.platform,
        category: s.category,
        name: s.name,
        description: s.description,
        ratePer1000: s.ratePer1k || s.ratePer1000,
        min: s.minOrder || s.min,
        max: s.maxOrder || s.max,
        speed: s.speed,
        status: s.status
      }));
    }
    return (window.TOOLKITY_DATA?.smmServices || []);
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
    if (!serviceSelect) return;

    const allServices = this.getServicesList();
    const filtered = allServices.filter(s =>
      s.platform.toLowerCase() === this.selectedCategory.toLowerCase()
    );

    if (filtered.length === 0) {
      serviceSelect.innerHTML = '<option value="">No services available for this platform</option>';
      this.selectedServiceId = null;
      this.updateServiceDetails();
      this.calculateTotalCharge();
      return;
    }

    // Group services by category
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
        const rate = s.ratePer1000 || s.ratePer1k;
        const formattedRate = rate < 0.1 ? rate.toFixed(3) : rate.toFixed(2);
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
    const allServices = this.getServicesList();
    const service = allServices.find(s => s.id === sId);
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
    const allServices = this.getServicesList();
    const service = allServices.find(s => s.id === this.selectedServiceId);
    const box = document.getElementById('new-order-service-details-box');
    if (!box) return;

    if (!service) {
      box.style.display = 'none';
      return;
    }

    const isPaused = service.status === 'paused';
    const rate = service.ratePer1000 || service.ratePer1k;
    const formattedRate = rate < 0.1 ? rate.toFixed(3) : rate.toFixed(2);
    box.style.display = 'block';
    box.innerHTML = `
      <div class="service-detail-item">
        <strong>Service:</strong> #${service.id} - ${service.name} ${isPaused ? '<span class="status-badge paused" style="margin-left: 0.5rem;">PAUSED</span>' : ''}
      </div>
      <div class="service-detail-item">
        <strong>Description:</strong> ${service.description || 'N/A'}
      </div>
      <div class="service-detail-meta-grid">
        <div><strong>Rate / 1k:</strong> <span style="color: var(--color-emerald); font-weight:800;">$${formattedRate} USD</span></div>
        <div><strong>Min / Max:</strong> ${(service.min || service.minOrder || 100).toLocaleString()} / ${(service.max || service.maxOrder || 100000).toLocaleString()}</div>
        <div><strong>Speed:</strong> ${service.speed}</div>
        <div><strong>Status:</strong> <span style="color: ${isPaused ? 'var(--color-amber)' : 'var(--color-emerald)'}; font-weight: 800;">${isPaused ? 'Paused' : 'Active'}</span></div>
      </div>
    `;

    const qtyInput = document.getElementById('new-order-quantity-input');
    if (qtyInput) {
      qtyInput.min = service.min || service.minOrder || 100;
      qtyInput.max = service.max || service.maxOrder || 100000;
      qtyInput.step = 100;
    }
  }

  calculateTotalCharge() {
    const allServices = this.getServicesList();
    const service = allServices.find(s => s.id === this.selectedServiceId);
    const chargeDisplay = document.getElementById('new-order-calculated-charge');
    if (!chargeDisplay) return;

    if (!service) {
      chargeDisplay.textContent = "$0.00 USD";
      return;
    }

    const rate = service.ratePer1000 || service.ratePer1k;
    const cost = (this.quantity / 1000) * rate;
    const finalCost = Math.max(0.001, cost);
    const displayCost = finalCost < 0.1 ? finalCost.toFixed(3) : finalCost.toFixed(2);
    chargeDisplay.textContent = `$${displayCost} USD`;

    this.updateBalanceIndicator(finalCost);
  }

  updateBalanceIndicator(currentCost = 0) {
    const balanceNotice = document.getElementById('new-order-balance-notice');
    if (!balanceNotice || !window.authManager) return;

    const user = window.authManager.user;
    const balance = user ? (user.balance || 0) : 0;

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

  async submitNewOrder() {
    const allServices = this.getServicesList();
    const service = allServices.find(s => s.id === this.selectedServiceId);
    const linkInput = document.getElementById('new-order-link-input');
    const link = (linkInput?.value || '').trim();

    if (!service) {
      window.toolkityApp?.showToast('Select Service', 'Please select a valid service.', 'warning');
      return;
    }

    if (service.status === 'paused') {
      window.toolkityApp?.showToast('Service Paused', 'This service is currently paused. Please pick another active service.', 'warning');
      return;
    }

    if (!link || link.length < 5) {
      window.toolkityApp?.showToast('Link Required', 'Please enter a valid target post or profile URL.', 'warning');
      linkInput?.focus();
      return;
    }

    // Check if user is logged in
    if (!window.authManager || !window.authManager.user || !window.authManager.user.isLoggedIn) {
      window.toolkityApp?.showToast('Sign In Required', 'Please sign in or register to place orders.', 'info');
      window.authManager?.openLoginModal();
      return;
    }

    const rate = service.ratePer1000 || service.ratePer1k;
    const cost = (this.quantity / 1000) * rate;
    const finalCost = Math.max(0.001, cost);

    // Check balance locally first for UX
    if ((window.authManager.user.balance || 0) < finalCost) {
      window.toolkityApp?.showToast(
        'Insufficient Balance',
        `Order cost is $${finalCost.toFixed(2)} USD, but your balance is $${window.authManager.user.balance.toFixed(2)} USD. Please deposit funds.`,
        'warning'
      );
      window.toolkityApp?.switchView('add-funds');
      return;
    }

    // Submit order via API
    const submitBtn = document.querySelector('#new-order-form button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.innerHTML = '<span>⏳</span> <span>Placing order...</span>';
      submitBtn.disabled = true;
    }

    try {
      const data = await window.smmAPI.placeOrder(service.id, this.quantity, link);

      // Update user data from API response
      if (data.user) {
        window.authManager.setUser({ ...data.user, isLoggedIn: true });
      }

      // Add to local orders list
      if (data.order) {
        this.orders.unshift({
          id: data.order.orderId,
          customer: data.order.customerUsername,
          serviceName: data.order.serviceName,
          platform: data.order.platform,
          link: data.order.targetLink,
          quantity: data.order.quantity,
          charge: `$${data.order.charge.toFixed(2)}`,
          status: data.order.status,
          date: new Date(data.order.createdAt).toISOString().replace('T', ' ').substring(0, 16)
        });
      }

      this.renderOrdersTable();

      if (linkInput) linkInput.value = '';

      window.toolkityApp?.showToast(
        'Order Placed Successfully!',
        data.message || `Order confirmed! SMMTOOL automated API execution started.`,
        'success'
      );

      // Switch to order history
      window.toolkityApp?.switchView('orders-history');
    } catch (error) {
      window.toolkityApp?.showToast('Order Failed', error.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
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
          </td>
          <td style="font-size: 0.78rem; color: var(--text-muted);">${o.date}</td>
        </tr>
      `;
    }).join('');
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.ordersManager = new OrdersManager();
});
