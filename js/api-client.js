/**
 * SMMTOOL Pro — API Client
 * Centralized fetch wrapper for all API communication.
 * Handles JWT tokens, error handling, and base URL configuration.
 */

class SMMToolAPI {
  constructor() {
    this.baseUrl = ''; // Same origin on Vercel
    this.tokenKey = 'smmtool_jwt_token';
    this.adminTokenKey = 'smmtool_admin_jwt_token';
  }

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token) {
    localStorage.setItem(this.tokenKey, token);
  }

  removeToken() {
    localStorage.removeItem(this.tokenKey);
  }

  getAdminToken() {
    return localStorage.getItem(this.adminTokenKey);
  }

  setAdminToken(token) {
    localStorage.setItem(this.adminTokenKey, token);
  }

  removeAdminToken() {
    localStorage.removeItem(this.adminTokenKey);
  }

  isLoggedIn() {
    return !!this.getToken();
  }

  isAdminLoggedIn() {
    return !!this.getAdminToken();
  }

  // ============================================
  // HTTP REQUEST HELPER
  // ============================================

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add auth token if available
    const token = options.useAdminToken ? this.getAdminToken() : this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Network error. Please check your internet connection.');
      }
      throw error;
    }
  }

  // ============================================
  // USER AUTH API
  // ============================================

  async register(email, password, username, name) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: { email, password, username, name }
    });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  logout() {
    this.removeToken();
  }

  // ============================================
  // ADMIN AUTH API
  // ============================================

  async adminLogin(email, password) {
    const data = await this.request('/api/admin/login', {
      method: 'POST',
      body: { email, password }
    });
    if (data.token) this.setAdminToken(data.token);
    return data;
  }

  adminLogout() {
    this.removeAdminToken();
  }

  // ============================================
  // SERVICES API (Public)
  // ============================================

  async getServices(filters = {}) {
    const params = new URLSearchParams();
    if (filters.platform) params.set('platform', filters.platform);
    if (filters.category) params.set('category', filters.category);
    if (filters.search) params.set('search', filters.search);
    const qs = params.toString();
    return this.request(`/api/services${qs ? '?' + qs : ''}`);
  }

  // ============================================
  // ORDERS API (User)
  // ============================================

  async getOrders(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.limit) params.set('limit', filters.limit);
    if (filters.skip) params.set('skip', filters.skip);
    const qs = params.toString();
    return this.request(`/api/orders${qs ? '?' + qs : ''}`);
  }

  async placeOrder(serviceId, quantity, targetLink) {
    return this.request('/api/orders', {
      method: 'POST',
      body: { serviceId, quantity, targetLink }
    });
  }

  // ============================================
  // WALLET API (User)
  // ============================================

  async getBalance() {
    return this.request('/api/wallet/balance');
  }

  async submitDeposit(depositData) {
    return this.request('/api/wallet/deposit', {
      method: 'POST',
      body: depositData
    });
  }

  // ============================================
  // TICKETS API (User)
  // ============================================

  async getTickets() {
    return this.request('/api/tickets');
  }

  async createTicket(subject, category, priority, message, orderReference) {
    return this.request('/api/tickets', {
      method: 'POST',
      body: { subject, category, priority, message, orderReference }
    });
  }

  // ============================================
  // ADMIN API
  // ============================================

  async adminGetStats() {
    return this.request('/api/admin/stats', { useAdminToken: true });
  }

  async adminGetServices(filters = {}) {
    const params = new URLSearchParams();
    if (filters.platform) params.set('platform', filters.platform);
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    const qs = params.toString();
    return this.request(`/api/admin/services${qs ? '?' + qs : ''}`, { useAdminToken: true });
  }

  async adminUpdateServices(body) {
    return this.request('/api/admin/services', {
      method: 'PUT',
      body,
      useAdminToken: true
    });
  }

  async adminGetOrders(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    if (filters.limit) params.set('limit', filters.limit);
    const qs = params.toString();
    return this.request(`/api/admin/orders${qs ? '?' + qs : ''}`, { useAdminToken: true });
  }

  async adminUpdateOrder(orderId, newStatus) {
    return this.request('/api/admin/orders', {
      method: 'PUT',
      body: { orderId, newStatus },
      useAdminToken: true
    });
  }

  async adminGetTickets(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    const qs = params.toString();
    return this.request(`/api/admin/tickets${qs ? '?' + qs : ''}`, { useAdminToken: true });
  }

  async adminUpdateTicket(body) {
    return this.request('/api/admin/tickets', {
      method: 'PUT',
      body,
      useAdminToken: true
    });
  }

  async adminGetGateways() {
    return this.request('/api/admin/gateways', { useAdminToken: true });
  }

  async adminUpdateGateways(body) {
    return this.request('/api/admin/gateways', {
      method: 'PUT',
      body,
      useAdminToken: true
    });
  }

  async adminGetAlerts() {
    return this.request('/api/admin/alerts', { useAdminToken: true });
  }

  async adminUpdateAlerts(body) {
    return this.request('/api/admin/alerts', {
      method: 'PUT',
      body,
      useAdminToken: true
    });
  }

  async adminGetDeposits(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    const qs = params.toString();
    return this.request(`/api/admin/deposits${qs ? '?' + qs : ''}`, { useAdminToken: true });
  }

  async adminProcessDeposit(depositId, action) {
    return this.request('/api/admin/deposits', {
      method: 'PUT',
      body: { depositId, action },
      useAdminToken: true
    });
  }

  async adminSeedServices(services) {
    return this.request('/api/admin/seed', {
      method: 'POST',
      body: { services },
      useAdminToken: true
    });
  }

  // ============================================
  // PUBLIC GATEWAYS (for user storefront)
  // ============================================

  async getGateways() {
    // Public endpoint to get enabled gateway info for deposit page
    return this.request('/api/admin/gateways', { useAdminToken: false });
  }
}

// Global singleton
window.smmAPI = new SMMToolAPI();
