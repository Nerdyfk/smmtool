/**
 * Toolkity Pro / Global SMM - Authentication & Google OAuth Controller
 * Supports Email/Password login & registration, Sign in with Google simulation,
 * and persistent session state in localStorage.
 */

class AuthManager {
  constructor() {
    this.storageKey = 'toolkity_user_session';
    this.user = this.loadUserSession();
    this.init();
  }

  init() {
    this.setupAuthModals();
    this.renderTopBarAuth();
    this.setupGoogleAuthModal();
  }

  loadUserSession() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading session:', e);
    }
    // Default initial mock logged-in state for instant preview
    const defaultUser = {
      isLoggedIn: true,
      role: "admin", // Administrator full control
      username: "global_builder",
      name: "Alex Vance",
      email: "builder@smmtool.pro",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      balance: 92.71,
      totalSpent: 234.69,
      ordersCount: 9,
      apiKey: "smmtool_live_79a24c18f902b3e8",
      tier: "Master Admin & VIP Elite",
      timezone: "UTC - 05:00 (EST)"
    };
    this.saveUserSession(defaultUser);
    return defaultUser;
  }

  saveUserSession(userData) {
    this.user = userData;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(userData));
    } catch (e) {
      console.error('Error saving session:', e);
    }
    this.renderTopBarAuth();
    window.dispatchEvent(new CustomEvent('auth:updated', { detail: this.user }));
  }

  renderTopBarAuth() {
    const container = document.getElementById('topbar-auth-container');
    if (!container) return;

    if (this.user && this.user.isLoggedIn) {
      const isAdmin = this.user.role === 'admin';
      container.innerHTML = `
        ${isAdmin ? `
          <button type="button" class="admin-topbar-pill" onclick="window.toolkityApp.switchView('admin-dashboard')" title="Open Master Admin Control Center">
            <span class="admin-shield-icon">🛡️</span>
            <span>Admin Panel</span>
          </button>
        ` : ''}

        <div class="user-balance-pill" onclick="window.toolkityApp.switchView('add-funds')" title="Click to Add Funds via Bangla QR or Crypto">
          <span class="balance-icon">💳</span>
          <span class="balance-amount">$${(this.user.balance || 0).toFixed(2)} USD</span>
          <span class="balance-plus">+</span>
        </div>

        <div class="user-profile-menu-wrapper" id="user-profile-menu-wrapper">
          <button type="button" class="user-avatar-btn" id="user-menu-trigger" aria-label="User Account Menu">
            <img src="${this.user.avatar}" alt="${this.user.username}" class="user-avatar-img">
            <span class="user-handle-name">@${this.user.username}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <div class="user-dropdown-dropdown" id="user-dropdown-dropdown">
            <div class="user-dropdown-header">
              <img src="${this.user.avatar}" alt="${this.user.username}" class="user-dropdown-avatar">
              <div>
                <div class="user-dropdown-name">${this.user.name}</div>
                <div class="user-dropdown-email">${this.user.email}</div>
                <div class="user-dropdown-tier">${this.user.tier}</div>
              </div>
            </div>
            <div class="user-dropdown-divider"></div>
            ${isAdmin ? `
              <a class="user-dropdown-item admin-highlight" data-action="admin-dashboard" style="background: rgba(130, 71, 229, 0.12); color: #a855f7; font-weight: 700;">
                <span>🛡️</span> <span>Master Admin Panel</span>
              </a>
            ` : ''}
            <a class="user-dropdown-item" data-action="new-order">
              <span>➕</span> <span>New Order</span>
            </a>
            <a class="user-dropdown-item" data-action="services-catalog">
              <span>📋</span> <span>Services & Rates</span>
            </a>
            <a class="user-dropdown-item" data-action="orders-history">
              <span>📜</span> <span>Order History</span>
            </a>
            <a class="user-dropdown-item" data-action="add-funds">
              <span>💳</span> <span>Add Funds (Bangla QR / Crypto)</span>
            </a>
            <a class="user-dropdown-item" data-action="support-tickets">
              <span>🎫</span> <span>Support & Problem Solver</span>
            </a>
            <a class="user-dropdown-item" data-action="account-settings">
              <span>⚙️</span> <span>Set Username & Profile</span>
            </a>
            <div class="user-dropdown-divider"></div>
            <a class="user-dropdown-item logout" data-action="logout">
              <span>🚪</span> <span>Sign Out</span>
            </a>
          </div>
        </div>
      `;

      // Wire dropdown trigger
      const trigger = document.getElementById('user-menu-trigger');
      const dropdown = document.getElementById('user-dropdown-dropdown');
      if (trigger && dropdown) {
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.classList.toggle('active');
        });
        document.addEventListener('click', () => dropdown.classList.remove('active'));
      }

      // Wire actions in dropdown
      container.querySelectorAll('.user-dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
          const action = item.getAttribute('data-action');
          if (action === 'logout') {
            this.logout();
          } else {
            window.toolkityApp.switchView(action);
          }
        });
      });

    } else {
      container.innerHTML = `
        <button type="button" class="btn-auth-nav" id="btn-topbar-signin">Sign In</button>
        <button type="button" class="btn-auth-nav primary" id="btn-topbar-signup">
          <span>🚀</span>
          <span>Sign Up</span>
        </button>
      `;

      document.getElementById('btn-topbar-signin')?.addEventListener('click', () => this.openLoginModal());
      document.getElementById('btn-topbar-signup')?.addEventListener('click', () => this.openRegisterModal());
    }
  }

  setupAuthModals() {
    // Form submits
    const loginForm = document.getElementById('auth-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const usernameOrEmail = document.getElementById('login-username-input')?.value || 'user';
        this.login({
          username: usernameOrEmail.includes('@') ? usernameOrEmail.split('@')[0] : usernameOrEmail,
          email: usernameOrEmail.includes('@') ? usernameOrEmail : `${usernameOrEmail}@global-smm.com`,
          name: usernameOrEmail
        });
      });
    }

    const registerForm = document.getElementById('auth-register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username-input')?.value || 'new_trader';
        const name = document.getElementById('register-name-input')?.value || 'New Creator';
        const email = document.getElementById('register-email-input')?.value || `${username}@global-smm.com`;
        this.register({ username, name, email });
      });
    }

    // Modal close buttons
    document.querySelectorAll('.auth-modal-close').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllAuthModals());
    });

    // Toggle between Login and Register
    document.getElementById('link-switch-to-register')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.closeLoginModal();
      this.openRegisterModal();
    });

    document.getElementById('link-switch-to-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.closeRegisterModal();
      this.openLoginModal();
    });

    // Google Buttons
    document.querySelectorAll('.btn-google-auth').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openGoogleAuthModal();
      });
    });
  }

  setupGoogleAuthModal() {
    // Simulated Google One-Tap / Account Picker
    const googleAccounts = [
      {
        name: "Alex Vance",
        email: "alex.vance.web3@gmail.com",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
      },
      {
        name: "Elena Rostova",
        email: "elena.design.ai@gmail.com",
        avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80"
      }
    ];

    const listEl = document.getElementById('google-account-list');
    if (listEl) {
      listEl.innerHTML = googleAccounts.map((acc, i) => `
        <div class="google-account-item" data-index="${i}">
          <img src="${acc.avatar}" alt="${acc.name}" class="google-account-avatar">
          <div class="google-account-info">
            <div class="google-account-name">${acc.name}</div>
            <div class="google-account-email">${acc.email}</div>
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('.google-account-item').forEach(item => {
        item.addEventListener('click', () => {
          const idx = parseInt(item.getAttribute('data-index'), 10);
          const sel = googleAccounts[idx];
          this.closeGoogleAuthModal();
          this.closeLoginModal();
          this.closeRegisterModal();

          const username = sel.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
          this.login({
            username: username,
            name: sel.name,
            email: sel.email,
            avatar: sel.avatar
          });

          window.toolkityApp.showToast(
            'Google Sign-In Successful',
            `Welcome back, ${sel.name}! Logged in via Google OAuth.`,
            'success'
          );
        });
      });
    }

    document.getElementById('google-auth-cancel')?.addEventListener('click', () => {
      this.closeGoogleAuthModal();
    });
  }

  openLoginModal() {
    document.getElementById('auth-login-modal')?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeLoginModal() {
    document.getElementById('auth-login-modal')?.classList.remove('active');
    document.body.style.overflow = '';
  }

  openRegisterModal() {
    document.getElementById('auth-register-modal')?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeRegisterModal() {
    document.getElementById('auth-register-modal')?.classList.remove('active');
    document.body.style.overflow = '';
  }

  openGoogleAuthModal() {
    document.getElementById('google-auth-modal')?.classList.add('active');
  }

  closeGoogleAuthModal() {
    document.getElementById('google-auth-modal')?.classList.remove('active');
  }

  closeAllAuthModals() {
    this.closeLoginModal();
    this.closeRegisterModal();
    this.closeGoogleAuthModal();
  }

  login(details) {
    const updated = {
      ...this.user,
      isLoggedIn: true,
      username: details.username || this.user.username,
      name: details.name || this.user.name,
      email: details.email || this.user.email,
      avatar: details.avatar || this.user.avatar
    };
    this.saveUserSession(updated);
    this.closeAllAuthModals();
    window.toolkityApp.showToast('Welcome Back!', `Signed in as @${updated.username}`, 'success');
  }

  register(details) {
    const newUser = {
      isLoggedIn: true,
      username: details.username,
      name: details.name,
      email: details.email,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
      balance: 10.00, // $10 free welcome balance credit
      totalSpent: 0.00,
      ordersCount: 0,
      apiKey: "pk_live_" + Math.random().toString(36).substring(2, 12),
      tier: "Standard",
      timezone: "UTC - 05:00 (EST)"
    };
    this.saveUserSession(newUser);
    this.closeAllAuthModals();
    window.toolkityApp.showToast('Account Created!', `Welcome to Toolkity Global SMM! $10.00 Welcome Balance credited.`, 'success');
  }

  logout() {
    const loggedOut = {
      ...this.user,
      isLoggedIn: false
    };
    this.saveUserSession(loggedOut);
    window.toolkityApp.showToast('Signed Out', 'You have been successfully signed out.', 'info');
  }

  creditBalance(amountUSD) {
    const current = this.user.balance || 0;
    const newBal = current + amountUSD;
    this.user.balance = parseFloat(newBal.toFixed(2));
    this.saveUserSession(this.user);
  }

  deductBalance(amountUSD) {
    const current = this.user.balance || 0;
    if (current >= amountUSD) {
      this.user.balance = parseFloat((current - amountUSD).toFixed(2));
      this.user.totalSpent = parseFloat(((this.user.totalSpent || 0) + amountUSD).toFixed(2));
      this.user.ordersCount = (this.user.ordersCount || 0) + 1;
      this.saveUserSession(this.user);
      return true;
    }
    return false;
  }

  updateProfile(data) {
    this.user = { ...this.user, ...data };
    this.saveUserSession(this.user);
    window.toolkityApp.showToast('Profile Updated', 'Your username and account settings have been saved.', 'success');
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.authManager = new AuthManager();
});
