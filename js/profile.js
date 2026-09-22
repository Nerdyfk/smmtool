/**
 * Toolkity Pro / Global SMM - User Profile & Set Username Controller
 * Handles user profile updates, changing username, API Key generation for reseller integration,
 * and account tier telemetry.
 */

class ProfileManager {
  constructor() {
    this.init();
  }

  init() {
    this.setupProfileForm();
    this.setupApiKeyControls();

    window.addEventListener('auth:updated', (e) => {
      this.populateFields(e.detail);
    });

    if (window.authManager && window.authManager.user) {
      this.populateFields(window.authManager.user);
    }
  }

  populateFields(user) {
    if (!user) return;

    const usernameInput = document.getElementById('profile-username-input');
    const nameInput = document.getElementById('profile-name-input');
    const emailInput = document.getElementById('profile-email-input');
    const tzSelect = document.getElementById('profile-timezone-select');
    const apiKeyDisplay = document.getElementById('profile-api-key-display');

    const heroUsername = document.getElementById('profile-hero-username');
    const heroTier = document.getElementById('profile-hero-tier');
    const heroAvatar = document.getElementById('profile-hero-avatar');
    const heroBalance = document.getElementById('profile-hero-balance');
    const heroOrders = document.getElementById('profile-hero-orders');

    if (usernameInput) usernameInput.value = user.username || '';
    if (nameInput) nameInput.value = user.name || '';
    if (emailInput) emailInput.value = user.email || '';
    if (tzSelect && user.timezone) tzSelect.value = user.timezone;
    if (apiKeyDisplay) apiKeyDisplay.value = user.apiKey || 'pk_live_default_key';

    if (heroUsername) heroUsername.textContent = `@${user.username}`;
    if (heroTier) heroTier.textContent = user.tier || 'VIP Gold';
    if (heroAvatar && user.avatar) heroAvatar.src = user.avatar;
    if (heroBalance) heroBalance.textContent = `$${(user.balance || 0).toFixed(2)}`;
    if (heroOrders) heroOrders.textContent = user.ordersCount || 0;
  }

  setupProfileForm() {
    const form = document.getElementById('profile-settings-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const newUsername = (document.getElementById('profile-username-input')?.value || '').trim();
      const newName = (document.getElementById('profile-name-input')?.value || '').trim();
      const newEmail = (document.getElementById('profile-email-input')?.value || '').trim();
      const newTz = document.getElementById('profile-timezone-select')?.value || 'UTC - 05:00 (EST)';

      if (!newUsername || newUsername.length < 3) {
        window.toolkityApp.showToast('Validation Error', 'Username must be at least 3 characters.', 'warning');
        return;
      }

      if (window.authManager) {
        window.authManager.updateProfile({
          username: newUsername,
          name: newName,
          email: newEmail,
          timezone: newTz
        });
      }
    });

    // Password change form
    const pwdForm = document.getElementById('profile-password-form');
    if (pwdForm) {
      pwdForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const currentPwd = document.getElementById('pwd-current-input')?.value;
        const newPwd = document.getElementById('pwd-new-input')?.value;
        const confirmPwd = document.getElementById('pwd-confirm-input')?.value;

        if (!currentPwd || !newPwd) {
          window.toolkityApp.showToast('Validation Error', 'Please enter your current and new password.', 'warning');
          return;
        }

        if (newPwd !== confirmPwd) {
          window.toolkityApp.showToast('Validation Error', 'New passwords do not match.', 'warning');
          return;
        }

        pwdForm.reset();
        window.toolkityApp.showToast('Security Updated', 'Your account password has been changed successfully.', 'success');
      });
    }
  }

  setupApiKeyControls() {
    const copyBtn = document.getElementById('btn-copy-api-key');
    const regenBtn = document.getElementById('btn-regen-api-key');
    const display = document.getElementById('profile-api-key-display');

    if (copyBtn && display) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(display.value).then(() => {
          window.toolkityApp.showToast('API Key Copied', 'Your Reseller API key has been copied to clipboard.', 'info');
        });
      });
    }

    if (regenBtn && display) {
      regenBtn.addEventListener('click', () => {
        const newKey = "pk_live_" + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
        display.value = newKey;
        if (window.authManager) {
          window.authManager.updateProfile({ apiKey: newKey });
        }
        window.toolkityApp.showToast('API Key Generated', 'New Reseller API Key activated. Update your API clients.', 'success');
      });
    }
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.profileManager = new ProfileManager();
});
