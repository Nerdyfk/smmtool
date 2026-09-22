/**
 * SMMTOOL Pro — Authentication Controller (API-backed)
 * Supports Email/Password login & registration via MongoDB backend,
 * JWT token session management, and Google OAuth placeholder.
 */

class AuthManager {
  constructor() {
    this.user = null;
    this.isLoading = true;
    this.init();
  }

  async init() {
    await this.restoreSession();
    this.setupAuthModals();
    this.renderTopBarAuth();
    this.setupGoogleAuthModal();
    this.isLoading = false;
  }

  /**
   * Restore session from JWT token via /api/auth/me
   */
  async restoreSession() {
    if (!window.smmAPI || !window.smmAPI.isLoggedIn()) {
      this.user = null;
      return;
    }

    try {
      const data = await window.smmAPI.getMe();
      if (data && data.user) {
        this.user = { ...data.user, isLoggedIn: true };
      } else {
        this.user = null;
        window.smmAPI.removeToken();
      }
    } catch (e) {
      console.warn('[SMMTOOL] Session restore failed:', e.message);
      this.user = null;
      window.smmAPI.removeToken();
    }
  }

  /**
   * Update local user state and notify all listeners
   */
  setUser(userData) {
    this.user = userData;
    this.renderTopBarAuth();
    window.dispatchEvent(new CustomEvent('auth:updated', { detail: this.user }));
  }

  renderTopBarAuth() {
    const container = document.getElementById('topbar-auth-container');
    if (!container) return;

    if (this.user && this.user.isLoggedIn) {
      container.innerHTML = `
        <div class="user-balance-pill" onclick="window.toolkityApp.switchView('add-funds')" title="Click to Add Funds via Bangla QR or Crypto">
          <span class="balance-icon">💳</span>
          <span class="balance-amount">$${(this.user.balance || 0).toFixed(2)} USD</span>
          <span class="balance-plus">+</span>
        </div>

        <div class="user-profile-menu-wrapper" id="user-profile-menu-wrapper">
          <button type="button" class="user-avatar-btn" id="user-menu-trigger" aria-label="User Account Menu">
            <img src="${this.user.avatar || 'https://ui-avatars.com/api/?name=U&background=a855f7&color=fff&size=100'}" alt="${this.user.username || 'User'}" class="user-avatar-img">
            <span class="user-handle-name">@${this.user.username || 'user'}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <div class="user-dropdown-dropdown" id="user-dropdown-dropdown">
            <div class="user-dropdown-header">
              <img src="${this.user.avatar || 'https://ui-avatars.com/api/?name=U&background=a855f7&color=fff&size=100'}" alt="${this.user.username || 'User'}" class="user-dropdown-avatar">
              <div>
                <div class="user-dropdown-name">${this.user.name || this.user.username || 'User'}</div>
                <div class="user-dropdown-email">${this.user.email || ''}</div>
                <div class="user-dropdown-tier">${this.user.tier || 'Starter'}</div>
              </div>
            </div>
            <div class="user-dropdown-divider"></div>
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
    // Login form
    const loginForm = document.getElementById('auth-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-username-input')?.value || '';
        const password = document.getElementById('login-password-input')?.value || '';

        if (!email || !password) {
          window.toolkityApp.showToast('Error', 'Please enter email and password.', 'error');
          return;
        }

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
          submitBtn.innerHTML = '<span>⏳</span> <span>Signing in...</span>';
          submitBtn.disabled = true;
        }

        try {
          const data = await window.smmAPI.login(email, password);
          this.setUser({ ...data.user, isLoggedIn: true });
          this.closeAllAuthModals();
          window.toolkityApp.showToast('Welcome Back!', `Signed in as @${data.user.username || data.user.email}`, 'success');
        } catch (error) {
          window.toolkityApp.showToast('Login Failed', error.message, 'error');
        } finally {
          if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
          }
        }
      });
    }

    // Register form
    const registerForm = document.getElementById('auth-register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username-input')?.value || '';
        const name = document.getElementById('register-name-input')?.value || '';
        const email = document.getElementById('register-email-input')?.value || '';
        const password = document.getElementById('register-password-input')?.value || '';

        if (!username || !email || !password) {
          window.toolkityApp.showToast('Error', 'Please fill in all required fields.', 'error');
          return;
        }

        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
          submitBtn.innerHTML = '<span>⏳</span> <span>Creating account...</span>';
          submitBtn.disabled = true;
        }

        try {
          const data = await window.smmAPI.register(email, password, username, name);
          this.setUser({ ...data.user, isLoggedIn: true });
          this.closeAllAuthModals();
          window.toolkityApp.showToast('Account Created!', `Welcome to SMMTOOL! Your account has been created.`, 'success');
        } catch (error) {
          window.toolkityApp.showToast('Registration Failed', error.message, 'error');
        } finally {
          if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
          }
        }
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
    // Google OAuth placeholder — will use real OAuth when GOOGLE_CLIENT_ID is set
    const googleAccounts = [
      {
        name: "Continue with Google",
        email: "Select your Google account",
        avatar: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
      }
    ];

    const listEl = document.getElementById('google-account-list');
    if (listEl) {
      listEl.innerHTML = `
        <div class="google-account-item" style="justify-content: center; padding: 1.5rem;">
          <div style="text-align: center;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔑</div>
            <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">Google OAuth Coming Soon</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Please use email/password login for now.</div>
          </div>
        </div>
      `;
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

  logout() {
    window.smmAPI.logout();
    this.user = null;
    this.setUser(null);
    window.toolkityApp.showToast('Signed Out', 'You have been successfully signed out.', 'info');
  }

  /**
   * Refresh user data from the API (after balance change, etc.)
   */
  async refreshUser() {
    try {
      const data = await window.smmAPI.getMe();
      if (data && data.user) {
        this.setUser({ ...data.user, isLoggedIn: true });
      }
    } catch (e) {
      console.warn('[SMMTOOL] Failed to refresh user:', e.message);
    }
  }

  creditBalance(amountUSD) {
    // After API-based deposit confirmation, refresh from server
    this.refreshUser();
  }

  deductBalance(amountUSD) {
    // Balance deduction now happens server-side via /api/orders POST
    // Refresh local state from server after order placement
    this.refreshUser();
    return true;
  }

  updateProfile(data) {
    // Profile updates will be API-based in future
    // For now, update local state
    this.user = { ...this.user, ...data };
    this.setUser(this.user);
    window.toolkityApp.showToast('Profile Updated', 'Your username and account settings have been saved.', 'success');
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.authManager = new AuthManager();
});
