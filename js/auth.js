/**
 * Toolkity Pro / Global SMM - Authentication & Google OAuth Controller
 * Supports Email/Password login & registration, Sign in with Google simulation,
 * and persistent session state in localStorage.
 */

class AuthManager {
  constructor() {
    this.storageKey = 'toolkity_user_session';
    this.accountsStorageKey = 'toolkity_registered_accounts';
    this.initAccountsStorage();
    this.user = this.loadUserSession();
    this.init();
  }

  init() {
    this.setupAuthModals();
    this.renderTopBarAuth();
    this.setupGoogleAuthModal();
    this.bindExternalAuthTriggers();
    this.checkUrlAuthTrigger();
    // Dispatch initial state so all view gatekeepers immediately align on first render
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('auth:updated', { detail: this.user }));
    }, 50);
  }

  bindExternalAuthTriggers() {
    // Sidebar triggers
    document.getElementById('sidebar-nav-signin')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openLoginModal();
    });

    document.getElementById('sidebar-nav-signup')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openRegisterModal();
    });

    // Dashboard Banner triggers
    document.getElementById('banner-btn-signin')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openLoginModal();
    });

    document.getElementById('banner-btn-signup')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openRegisterModal();
    });

    // Generic triggers across the site with data-auth-action
    document.querySelectorAll('[data-auth-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.getAttribute('data-auth-action');
        if (action === 'register' || action === 'signup') {
          this.openRegisterModal();
        } else {
          this.openLoginModal();
        }
      });
    });
  }

  checkUrlAuthTrigger() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const authParam = urlParams.get('auth');
      const hash = window.location.hash.toLowerCase();
      if (authParam === 'login' || authParam === 'signin' || hash === '#login' || hash === '#signin') {
        setTimeout(() => this.openLoginModal(), 350);
      } else if (authParam === 'register' || authParam === 'signup' || hash === '#register' || hash === '#signup') {
        setTimeout(() => this.openRegisterModal(), 350);
      }
    } catch (e) {
      console.warn('URL auth check:', e);
    }
  }

  openAuthModal(mode = 'register') {
    if (mode === 'login' || mode === 'signin') {
      this.openLoginModal();
    } else {
      this.openRegisterModal();
    }
  }

  initAccountsStorage() {
    try {
      const saved = localStorage.getItem(this.accountsStorageKey);
      if (saved) {
        let accounts = JSON.parse(saved);
        // Purge any legacy mock test profiles
        accounts = accounts.filter(a => a.email !== 'builder@smmtool.pro' && a.username !== 'global_builder' && a.name !== 'Alex Vance');
        localStorage.setItem(this.accountsStorageKey, JSON.stringify(accounts));
      } else {
        localStorage.setItem(this.accountsStorageKey, JSON.stringify([]));
      }
    } catch (e) {
      console.error('Error initializing accounts storage:', e);
    }
  }

  getAccounts() {
    try {
      const raw = localStorage.getItem(this.accountsStorageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  saveAccount(account) {
    try {
      const accounts = this.getAccounts();
      const existingIdx = accounts.findIndex(a => a.email.toLowerCase() === account.email.toLowerCase());
      if (existingIdx >= 0) {
        accounts[existingIdx] = { ...accounts[existingIdx], ...account };
      } else {
        accounts.push(account);
      }
      localStorage.setItem(this.accountsStorageKey, JSON.stringify(accounts));
    } catch (e) {
      console.error('Error saving account:', e);
    }
  }

  findAccount(identifier) {
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase();
    const accounts = this.getAccounts();
    return accounts.find(a => 
      (a.email && a.email.toLowerCase() === clean) || 
      (a.username && a.username.toLowerCase() === clean)
    ) || null;
  }

  showAuthFeedback(message, type = 'error') {
    const banner = document.getElementById('auth-feedback-banner');
    if (!banner) return;
    banner.className = `auth-feedback-banner ${type}`;
    banner.innerHTML = `
      <span>${type === 'error' ? '⚠️' : '✓'}</span>
      <span>${message}</span>
    `;
    banner.style.display = 'flex';
  }

  clearAuthFeedback() {
    const banner = document.getElementById('auth-feedback-banner');
    if (banner) {
      banner.style.display = 'none';
      banner.textContent = '';
    }
    document.querySelectorAll('.vibe-input-box').forEach(box => {
      box.classList.remove('input-error', 'shake');
    });
  }

  loadUserSession() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const session = JSON.parse(saved);
        // Purge any legacy mock session with Alex Vance, builder@smmtool.pro, or fake 92.71 balance
        if (
          session &&
          (session.email === 'builder@smmtool.pro' ||
           session.username === 'global_builder' ||
           session.name === 'Alex Vance' ||
           (session.balance === 92.71 && session.totalSpent === 234.69) ||
           (!session.isLoggedIn && session.role === 'admin'))
        ) {
          localStorage.removeItem(this.storageKey);
        } else if (session && session.isLoggedIn) {
          return session;
        }
      }
    } catch (e) {
      console.error('Error loading session:', e);
    }
    // Default initial state: Guest visitor so Sign In & Sign Up buttons are immediately visible
    const guestUser = {
      isLoggedIn: false,
      role: "guest",
      username: "guest",
      name: "Guest User",
      email: "",
      avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=guest",
      balance: 0.00,
      totalSpent: 0.00,
      ordersCount: 0,
      apiKey: "",
      tier: "Standard",
      timezone: "UTC"
    };
    return guestUser;
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
          <a href="/admin" class="admin-topbar-pill" style="text-decoration: none;" title="Open Backend Admin Portal">
            <span class="admin-shield-icon">🛡️</span>
            <span>Admin Portal</span>
          </a>
        ` : ''}

        <div class="user-balance-pill" onclick="window.toolkityApp.switchView('add-funds')" title="Click to Add Funds via Bangla QR or Crypto">
          <span class="balance-icon">💳</span>
          <span class="balance-amount">$${(this.user.balance || 0).toFixed(2)} USD</span>
          <span class="balance-plus">+</span>
        </div>

        <button type="button" class="btn-auth-switch-pill" id="btn-topbar-switch-auth" title="Sign In with another account or Register">
          <span>🔑</span>
          <span>Sign In / Switch</span>
        </button>

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
              <a class="user-dropdown-item admin-highlight" data-action="admin-portal" style="background: rgba(130, 71, 229, 0.12); color: #a855f7; font-weight: 700;">
                <span>🛡️</span> <span>Backend Admin Portal ↗</span>
              </a>
            ` : ''}
            <a class="user-dropdown-item" data-action="open-login" style="color: #6366f1; font-weight: 700;">
              <span>🔑</span> <span>Sign In (Switch User)</span>
            </a>
            <a class="user-dropdown-item" data-action="open-register" style="color: #ec4899; font-weight: 700;">
              <span>✨</span> <span>Create New Account (Sign Up)</span>
            </a>
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

      // Wire switch auth button
      document.getElementById('btn-topbar-switch-auth')?.addEventListener('click', () => this.openLoginModal());

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
          if (action === 'open-login') {
            this.openLoginModal();
          } else if (action === 'open-register') {
            this.openRegisterModal();
          } else if (action === 'logout') {
            this.logout();
          } else if (action === 'admin-portal' || action === 'admin-dashboard') {
            window.open('/admin', '_blank');
          } else {
            window.toolkityApp.switchView(action);
          }
        });
      });

    } else {
      container.innerHTML = `
        <button type="button" class="btn-auth-nav" id="btn-topbar-signin" style="cursor: pointer;">
          <span>🔑</span>
          <span>Sign In</span>
        </button>
        <button type="button" class="btn-auth-nav primary" id="btn-topbar-signup" style="cursor: pointer;">
          <span>🚀</span>
          <span>Sign Up</span>
        </button>
      `;

      document.getElementById('btn-topbar-signin')?.addEventListener('click', () => this.openLoginModal());
      document.getElementById('btn-topbar-signup')?.addEventListener('click', () => this.openRegisterModal());
    }
  }

  setupAuthModals() {
    this.currentMode = 'register';

    // Mode Switchers
    const tabRegister = document.getElementById('tab-register-mode');
    const tabLogin = document.getElementById('tab-login-mode');
    const switchBtn = document.getElementById('auth-switch-btn');

    tabRegister?.addEventListener('click', () => this.switchMode('register'));
    tabLogin?.addEventListener('click', () => this.switchMode('login'));
    switchBtn?.addEventListener('click', () => {
      this.switchMode(this.currentMode === 'register' ? 'login' : 'register');
    });

    // Close button & backdrop dismissal
    document.getElementById('auth-stage-close-btn')?.addEventListener('click', () => {
      this.closeAllAuthModals();
    });

    const authModal = document.getElementById('auth-modal');
    authModal?.addEventListener('click', (e) => {
      if (e.target === authModal) {
        this.closeAllAuthModals();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && authModal?.classList.contains('active')) {
        this.closeAllAuthModals();
      }
    });

    // Password visibility toggle
    const pwdToggle = document.getElementById('vibe-password-toggle');
    const pwdInput = document.getElementById('auth-password-input');
    pwdToggle?.addEventListener('click', () => {
      if (!pwdInput) return;
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      pwdToggle.textContent = isPwd ? '🙈' : '👁️';
    });

    // Character interactive reactions when focusing form fields
    const charLeftArm = document.querySelector('.char-left-arm-point');
    const charHead = document.querySelector('.char-head-bob');
    const charRoot = document.querySelector('.char-root-dance');

    const formInputs = [
      document.getElementById('auth-name-input'),
      document.getElementById('auth-username-input'),
      document.getElementById('auth-email-input'),
      document.getElementById('auth-password-input')
    ];

    formInputs.forEach((input, index) => {
      if (!input) return;
      input.addEventListener('focus', () => {
        if (charLeftArm) {
          charLeftArm.style.transform = `rotate(${16 + index * 3}deg) translate(8px, -6px)`;
          charLeftArm.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
        }
        if (charHead) {
          charHead.style.transform = 'translateY(-6px) rotate(4deg)';
          charHead.style.transition = 'transform 0.25s ease';
        }
      });

      input.addEventListener('blur', () => {
        if (charLeftArm) {
          charLeftArm.style.transform = '';
          charLeftArm.style.transition = '';
        }
        if (charHead) {
          charHead.style.transform = '';
          charHead.style.transition = '';
        }
      });

      input.addEventListener('input', () => {
        this.clearAuthFeedback();
      });
    });

    // Forgot Password link
    document.getElementById('auth-forgot-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('auth-email-input');
      const emailVal = emailInput?.value.trim() || '';
      if (!emailVal || !emailVal.includes('@')) {
        this.showAuthFeedback('Please enter your email in the field above to receive a reset link.', 'error');
        document.getElementById('box-email-input')?.classList.add('input-error', 'shake');
        emailInput?.focus();
        return;
      }
      this.showAuthFeedback(`Password recovery link sent to ${emailVal}! Check your inbox.`, 'success');
      window.toolkityApp.showToast('Reset Link Sent', `Password recovery link sent to ${emailVal}`, 'info');
    });

    // Form submission: Email & Password Sign Up / Sign In
    const form = document.getElementById('auth-interactive-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.clearAuthFeedback();

        const emailInput = document.getElementById('auth-email-input');
        const passwordInput = document.getElementById('auth-password-input');
        const nameInput = document.getElementById('auth-name-input');
        const usernameInput = document.getElementById('auth-username-input');

        const emailBox = document.getElementById('box-email-input');
        const passwordBox = document.getElementById('box-password-input');
        const usernameBox = document.getElementById('box-username-input');

        const emailVal = emailInput?.value.trim() || '';
        const passwordVal = passwordInput?.value || '';
        const nameVal = nameInput?.value.trim() || '';
        const usernameVal = usernameInput?.value.trim() || '';

        // Mode: REGISTER
        if (this.currentMode === 'register') {
          // Email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailVal || !emailRegex.test(emailVal)) {
            emailBox?.classList.add('input-error', 'shake');
            emailInput?.focus();
            this.showAuthFeedback('Please enter a valid email address (e.g. name@company.com).', 'error');
            return;
          }

          // Password validation: minimum 6 chars
          if (!passwordVal || passwordVal.length < 6) {
            passwordBox?.classList.add('input-error', 'shake');
            passwordInput?.focus();
            this.showAuthFeedback('Password must be at least 6 characters long.', 'error');
            return;
          }

          // Check if already registered
          const existing = this.findAccount(emailVal);
          if (existing) {
            emailBox?.classList.add('input-error', 'shake');
            this.showAuthFeedback('An account with this email already exists! Switching to Sign in...', 'error');
            setTimeout(() => {
              this.switchMode('login');
              if (emailInput) emailInput.value = emailVal;
              passwordInput?.focus();
            }, 1200);
            return;
          }

          // Generate display name & handle
          const cleanHandle = usernameVal || emailVal.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
          const cleanName = nameVal || cleanHandle.charAt(0).toUpperCase() + cleanHandle.slice(1);

          // Save account to persistent local storage database
          const newAccount = {
            name: cleanName,
            username: cleanHandle,
            email: emailVal,
            password: passwordVal,
            balance: 10.00, // $10 welcome balance bonus
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanHandle}&backgroundColor=b6e3f4`,
            tier: "Standard",
            createdAt: new Date().toISOString()
          };
          this.saveAccount(newAccount);

          // Cheerful bounce animation
          if (charRoot) {
            charRoot.style.transform = 'scale(1.12) translateY(-18px)';
            charRoot.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
            setTimeout(() => {
              if (charRoot) {
                charRoot.style.transform = '';
                charRoot.style.transition = '';
              }
            }, 700);
          }

          this.register(newAccount);
        }
        // Mode: LOGIN
        else {
          // Identifier (email or username)
          if (!emailVal) {
            emailBox?.classList.add('input-error', 'shake');
            emailInput?.focus();
            this.showAuthFeedback('Please enter your email or username.', 'error');
            return;
          }

          // Password validation
          if (!passwordVal) {
            passwordBox?.classList.add('input-error', 'shake');
            passwordInput?.focus();
            this.showAuthFeedback('Please enter your password.', 'error');
            return;
          }

          const account = this.findAccount(emailVal);
          if (account) {
            // Validate password
            if (account.password && account.password !== passwordVal) {
              passwordBox?.classList.add('input-error', 'shake');
              passwordInput?.focus();
              this.showAuthFeedback('Incorrect password. Please verify your credentials or click Forgot?', 'error');
              if (charHead) {
                charHead.style.transform = 'rotate(-8deg)';
                setTimeout(() => {
                  if (charHead) charHead.style.transform = '';
                }, 400);
              }
              return;
            }

            // Success animation
            if (charRoot) {
              charRoot.style.transform = 'scale(1.1) translateY(-14px)';
              charRoot.style.transition = 'transform 0.3s ease';
              setTimeout(() => {
                if (charRoot) {
                  charRoot.style.transform = '';
                  charRoot.style.transition = '';
                }
              }, 600);
            }

            this.login({
              name: account.name,
              username: account.username,
              email: account.email,
              avatar: account.avatar,
              balance: account.balance,
              tier: account.tier
            });
          } else {
            // If email is formatted correctly and password >= 6, automatically provision account and login
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(emailVal) && passwordVal.length >= 6) {
              const autoUsername = emailVal.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
              const autoName = autoUsername.charAt(0).toUpperCase() + autoUsername.slice(1);
              const createdAcc = {
                name: autoName,
                username: autoUsername,
                email: emailVal,
                password: passwordVal,
                balance: 10.00,
                avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${autoUsername}&backgroundColor=b6e3f4`,
                tier: "Standard"
              };
              this.saveAccount(createdAcc);
              this.login(createdAcc);
              window.toolkityApp.showToast('Account Created & Signed In', `Welcome, ${autoName}! $10.00 Welcome Balance credited.`, 'success');
            } else {
              emailBox?.classList.add('input-error', 'shake');
              this.showAuthFeedback('No account found with this email. Switch to "Register now" to sign up.', 'error');
            }
          }
        }
      });
    }

    // Google Sign-In Trigger
    const googleTrigger = document.getElementById('btn-google-auth-trigger');
    googleTrigger?.addEventListener('click', (e) => {
      e.preventDefault();
      this.triggerGoogleSignIn();
    });

    // Setup Google Auth Modal & GIS listeners
    this.setupGoogleAuthModal();

    // Default to Register Mode initially
    this.switchMode('register');
  }

  switchMode(mode = 'register') {
    this.currentMode = mode;
    this.clearAuthFeedback();

    const tabRegister = document.getElementById('tab-register-mode');
    const tabLogin = document.getElementById('tab-login-mode');
    const stageTitle = document.getElementById('auth-stage-title');
    const stageSubtitle = document.getElementById('auth-stage-subtitle');
    const nameGroup = document.getElementById('field-name-group');
    const usernameGroup = document.getElementById('field-username-group');
    const passwordHint = document.getElementById('password-hint');
    const forgotLink = document.getElementById('auth-forgot-link');
    const rememberRow = document.getElementById('auth-remember-row');
    const submitBtnText = document.getElementById('btn-vibe-submit-text');
    const switchQuestion = document.getElementById('auth-switch-question');
    const switchBtn = document.getElementById('auth-switch-btn');
    const googleBtnLabel = document.getElementById('google-btn-label');

    if (mode === 'login') {
      tabRegister?.classList.remove('active');
      tabLogin?.classList.add('active');

      if (stageTitle) stageTitle.textContent = 'Sign in';
      if (stageSubtitle) stageSubtitle.textContent = 'Welcome back! Log in to manage orders, funds & API';
      if (googleBtnLabel) googleBtnLabel.textContent = 'Sign in with Google';
      if (nameGroup) nameGroup.style.display = 'none';
      if (usernameGroup) usernameGroup.style.display = 'none';
      if (passwordHint) passwordHint.style.display = 'none';
      if (forgotLink) forgotLink.style.display = 'inline';
      if (rememberRow) rememberRow.style.display = 'flex';
      if (submitBtnText) submitBtnText.textContent = 'Sign in';
      if (switchQuestion) switchQuestion.textContent = "Don't have an account?";
      if (switchBtn) switchBtn.textContent = 'Register now';
    } else {
      this.currentMode = 'register';
      tabRegister?.classList.add('active');
      tabLogin?.classList.remove('active');

      if (stageTitle) stageTitle.textContent = 'Register now';
      if (stageSubtitle) stageSubtitle.textContent = 'Secure your spot & access our high-speed global SMM network';
      if (googleBtnLabel) googleBtnLabel.textContent = 'Continue with Google';
      if (nameGroup) nameGroup.style.display = 'block';
      if (usernameGroup) usernameGroup.style.display = 'block';
      if (passwordHint) passwordHint.style.display = 'block';
      if (forgotLink) forgotLink.style.display = 'none';
      if (rememberRow) rememberRow.style.display = 'none';
      if (submitBtnText) submitBtnText.textContent = 'Next';
      if (switchQuestion) switchQuestion.textContent = 'Already have an account?';
      if (switchBtn) switchBtn.textContent = 'Sign in';
    }
  }

  triggerGoogleSignIn() {
    // Check if Google Identity Services (GIS) library is initialized
    if (window.google && window.google.accounts && window.google.accounts.id) {
      try {
        const clientId = window.GOOGLE_CLIENT_ID || '102938475610-exampleclientid.apps.googleusercontent.com';
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => this.handleGoogleCredentialResponse(resp),
          auto_select: false,
          cancel_on_tap_outside: true
        });

        // Trigger Google One Tap directly on the user's device
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            this.openGooglePermissionModal();
          }
        });
        return;
      } catch (err) {
        console.warn('Google Identity prompt notice:', err);
      }
    }

    // Direct Google Permission authorization modal
    this.openGooglePermissionModal();
  }

  handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) return;
    try {
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const payload = JSON.parse(jsonPayload);

      if (payload && payload.email) {
        this.loginWithGoogleAccount({
          name: payload.name || payload.given_name || payload.email.split('@')[0],
          email: payload.email,
          avatar: payload.picture || `https://api.dicebear.com/7.x/identicon/svg?seed=${payload.email}`
        });
      }
    } catch (e) {
      console.error('Error decoding Google credential token:', e);
      this.openGooglePermissionModal();
    }
  }

  openGooglePermissionModal() {
    const modal = document.getElementById('google-permission-modal');
    if (!modal) return;

    // Render official Google button if GIS client is loaded
    const btnContainer = document.getElementById('google-gsi-button-container');
    if (btnContainer && window.google && window.google.accounts && window.google.accounts.id) {
      try {
        window.google.accounts.id.renderButton(btnContainer, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill'
        });
      } catch (e) {
        // Fallback to device email authorization form
      }
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const emailInput = document.getElementById('google-device-email-input');
    if (emailInput) {
      emailInput.focus();
    }
  }

  closeGooglePermissionModal() {
    const modal = document.getElementById('google-permission-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  setupGoogleAuthModal() {
    const modal = document.getElementById('google-permission-modal');
    const closeBtn = document.getElementById('google-perm-close');
    const cancelBtn = document.getElementById('google-perm-cancel');
    const form = document.getElementById('google-auth-device-form');
    const emailInput = document.getElementById('google-device-email-input');

    closeBtn?.addEventListener('click', () => this.closeGooglePermissionModal());
    cancelBtn?.addEventListener('click', () => this.closeGooglePermissionModal());

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) this.closeGooglePermissionModal();
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = (emailInput?.value || '').trim().toLowerCase();
      if (!email || !email.includes('@') || !email.includes('.')) {
        window.toolkityApp?.showToast('Valid Email Required', 'Please enter your device Google Account email (e.g. name@gmail.com).', 'warning');
        emailInput?.focus();
        return;
      }

      // Format name from email
      const localPart = email.split('@')[0];
      const rawName = localPart.replace(/[._-]/g, ' ');
      const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

      this.loginWithGoogleAccount({
        name: formattedName,
        email: email,
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${email}`
      });
      this.closeGooglePermissionModal();
    });
  }

  loginWithGoogleAccount(acc) {
    const username = acc.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
    
    // Check if account already exists in registered accounts
    const existing = this.findAccount(acc.email);
    let sessionData;

    if (existing) {
      sessionData = {
        isLoggedIn: true,
        role: existing.role || 'user',
        username: existing.username || username,
        name: existing.name || acc.name,
        email: existing.email,
        avatar: acc.avatar || existing.avatar,
        balance: typeof existing.balance === 'number' ? existing.balance : 0.00,
        totalSpent: typeof existing.totalSpent === 'number' ? existing.totalSpent : 0.00,
        ordersCount: existing.ordersCount || 0,
        apiKey: existing.apiKey || ("smmtool_live_" + Math.random().toString(36).substring(2, 14)),
        tier: existing.tier || "Standard",
        timezone: existing.timezone || "UTC",
        authProvider: "google"
      };
    } else {
      // Clean new account starting with $0.00 balance
      sessionData = {
        isLoggedIn: true,
        role: 'user',
        username: username,
        name: acc.name,
        email: acc.email,
        avatar: acc.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`,
        balance: 0.00,
        totalSpent: 0.00,
        ordersCount: 0,
        apiKey: "smmtool_live_" + Math.random().toString(36).substring(2, 14),
        tier: "Standard",
        timezone: "UTC",
        authProvider: "google"
      };
      this.saveAccount(sessionData);
    }

    this.saveUserSession(sessionData);
    this.closeAllAuthModals();

    window.toolkityApp?.showToast(
      'Google Sign-In Successful',
      `Welcome, ${sessionData.name}! Successfully signed in via Google.`,
      'success'
    );
  }

  openLoginModal() {
    this.switchMode('login');
    document.getElementById('auth-modal')?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeLoginModal() {
    document.getElementById('auth-modal')?.classList.remove('active');
    document.body.style.overflow = '';
  }

  openRegisterModal() {
    this.switchMode('register');
    document.getElementById('auth-modal')?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeRegisterModal() {
    document.getElementById('auth-modal')?.classList.remove('active');
    document.body.style.overflow = '';
  }

  openGoogleAuthModal() {
    this.triggerGoogleSignIn();
  }

  closeGoogleAuthModal() {
    this.closeGooglePermissionModal();
  }

  closeAllAuthModals() {
    document.getElementById('auth-modal')?.classList.remove('active');
    document.body.style.overflow = '';
    this.closeGooglePermissionModal();
    this.clearAuthFeedback();
  }

  login(details) {
    const updated = {
      ...this.user,
      isLoggedIn: true,
      username: details.username || this.user.username,
      name: details.name || this.user.name,
      email: details.email || this.user.email,
      avatar: details.avatar || this.user.avatar,
      balance: details.balance !== undefined ? details.balance : this.user.balance,
      tier: details.tier || this.user.tier || "VIP Pro"
    };
    this.saveUserSession(updated);
    this.closeAllAuthModals();
    window.toolkityApp.showToast('Welcome Back!', `Signed in as @${updated.username} (${updated.email})`, 'success');
  }

  register(details) {
    const newUser = {
      isLoggedIn: true,
      username: details.username,
      name: details.name,
      email: details.email,
      avatar: details.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
      balance: details.balance !== undefined ? details.balance : 10.00, // $10 free welcome balance credit
      totalSpent: 0.00,
      ordersCount: 0,
      apiKey: "pk_live_" + Math.random().toString(36).substring(2, 12),
      tier: details.tier || "Standard",
      timezone: "UTC - 05:00 (EST)",
      authProvider: "email"
    };
    this.saveUserSession(newUser);
    this.closeAllAuthModals();
    window.toolkityApp.showToast('Account Created!', `Welcome to SMMTOOL! $10.00 Welcome Balance credited to your account.`, 'success');
  }

  logout() {
    const loggedOut = {
      isLoggedIn: false,
      role: "guest",
      username: "guest",
      name: "Guest User",
      email: "",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
      balance: 0.00,
      totalSpent: 0.00,
      ordersCount: 0,
      apiKey: "",
      tier: "Standard",
      timezone: "UTC - 05:00 (EST)"
    };
    this.saveUserSession(loggedOut);
    window.toolkityApp.showToast('Signed Out', 'You have been signed out. Click Sign In to access your account.', 'info');
    setTimeout(() => this.openLoginModal(), 400);
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

// Global initialization and helper exposure
document.addEventListener('DOMContentLoaded', () => {
  window.authManager = new AuthManager();
  window.openAuthModal = (mode = 'register') => {
    if (window.authManager) {
      window.authManager.openAuthModal(mode);
    }
  };
});
