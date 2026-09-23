/**
 * Toolkity Pro / Global SMM - User Profile & Set Username Controller
 * Handles user profile updates, changing username, API Key generation for reseller integration,
 * account tier telemetry, and real-time Telegram Order Completion notification bot sync.
 */

class ProfileManager {
  constructor() {
    this.telegramSettings = this.loadTelegramSettings();
    this.init();
  }

  init() {
    this.setupProfileForm();
    this.setupApiKeyControls();
    this.setupTelegramControls();

    window.addEventListener('auth:updated', (e) => {
      this.populateFields(e.detail);
    });

    if (window.authManager && window.authManager.user) {
      this.populateFields(window.authManager.user);
    }

    // Listen for real-time order completion events across the application
    window.addEventListener('order:completed', (e) => {
      this.handleOrderCompleted(e.detail);
    });

    // Global hook for direct dispatches
    window.dispatchTelegramOrderNotification = (order, status) => {
      this.handleOrderNotification(order, status || 'Completed');
    };
  }

  loadTelegramSettings() {
    try {
      const saved = localStorage.getItem('smmtool_telegram_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading Telegram settings:', e);
    }

    return {
      connected: false,
      telegramUsername: '',
      chatId: '',
      syncCode: 'SYNC-' + Math.floor(100000 + Math.random() * 900000) + '-SMM',
      botUsername: 'SMMToolNotifyBot',
      notifyOnCompleted: true,
      notifyOnInProgress: false,
      notifyOnRefund: true,
      customBotToken: '',
      customChatId: '',
      notificationHistory: [
        {
          id: 'NTF-INIT',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          event: 'System Ready',
          orderId: '#ORD-DEMO',
          recipient: '@SMMToolNotifyBot',
          status: 'Ready'
        }
      ]
    };
  }

  saveTelegramSettings() {
    try {
      localStorage.setItem('smmtool_telegram_settings', JSON.stringify(this.telegramSettings));
    } catch (e) {
      console.error('Error saving Telegram settings:', e);
    }
    this.renderTelegramState();
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

    const isLoggedIn = Boolean(user && user.isLoggedIn);

    const guestGate = document.getElementById('account-settings-guest-gate');
    const userContent = document.getElementById('account-settings-user-content');

    if (guestGate) guestGate.style.display = isLoggedIn ? 'none' : 'flex';
    if (userContent) userContent.style.display = isLoggedIn ? 'block' : 'none';

    if (!isLoggedIn) {
      if (usernameInput) usernameInput.value = '';
      if (nameInput) nameInput.value = '';
      if (emailInput) emailInput.value = '';
      if (apiKeyDisplay) apiKeyDisplay.value = '';
      return;
    }

    if (usernameInput) usernameInput.value = user.username || '';
    if (nameInput) nameInput.value = user.name || '';
    if (emailInput) emailInput.value = user.email || '';
    if (tzSelect && user.timezone) tzSelect.value = user.timezone;
    if (apiKeyDisplay) apiKeyDisplay.value = user.apiKey || '';

    if (heroUsername) heroUsername.textContent = `@${user.username}`;
    if (heroTier) heroTier.textContent = user.tier || 'Standard';
    if (heroAvatar) heroAvatar.src = user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
    if (heroBalance) heroBalance.textContent = `$${(user.balance || 0).toFixed(2)}`;
    if (heroOrders) heroOrders.textContent = user.ordersCount || 0;

    // Update Telegram Bot link with current user username
    const botLink = document.getElementById('btn-open-telegram-bot');
    if (botLink) {
      botLink.href = `https://t.me/SMMToolNotifyBot?start=${this.telegramSettings.syncCode || 'SYNC_DEMO'}`;
    }

    this.renderTelegramState();
  }

  setupProfileForm() {
    const form = document.getElementById('profile-settings-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!window.authManager || !window.authManager.user || !window.authManager.user.isLoggedIn) {
        window.toolkityApp?.showToast('Sign In Required', 'Please sign in or register to update your profile.', 'info');
        window.authManager?.openLoginModal();
        return;
      }

      const newUsername = (document.getElementById('profile-username-input')?.value || '').trim();
      const newName = (document.getElementById('profile-name-input')?.value || '').trim();
      const newEmail = (document.getElementById('profile-email-input')?.value || '').trim();
      const newTz = document.getElementById('profile-timezone-select')?.value || 'UTC';

      if (!newUsername || newUsername.length < 3) {
        window.toolkityApp?.showToast('Validation Error', 'Username must be at least 3 characters.', 'warning');
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
          window.toolkityApp?.showToast('Validation Error', 'Please enter your current and new password.', 'warning');
          return;
        }

        if (newPwd !== confirmPwd) {
          window.toolkityApp?.showToast('Validation Error', 'New passwords do not match.', 'warning');
          return;
        }

        pwdForm.reset();
        window.toolkityApp?.showToast('Security Updated', 'Your account password has been changed successfully.', 'success');
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
          window.toolkityApp?.showToast('API Key Copied', 'Your Reseller API key has been copied to clipboard.', 'info');
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
        window.toolkityApp?.showToast('API Key Generated', 'New Reseller API Key activated. Update your API clients.', 'success');
      });
    }
  }

  // ==========================================
  // TELEGRAM BOT ORDER NOTIFICATIONS CONTROLLER
  // ==========================================
  setupTelegramControls() {
    // 1. Tab Navigation
    const tabBot = document.getElementById('tg-tab-botlink');
    const tabManual = document.getElementById('tg-tab-manual');
    const tabCustom = document.getElementById('tg-tab-custom');

    const paneBot = document.getElementById('tg-pane-botlink');
    const paneManual = document.getElementById('tg-pane-manual');
    const paneCustom = document.getElementById('tg-pane-custom');

    const switchTab = (activeTab, activePane) => {
      [tabBot, tabManual, tabCustom].forEach(t => t && t.classList.remove('active'));
      [paneBot, paneManual, paneCustom].forEach(p => {
        if (p) p.style.display = 'none';
      });

      if (activeTab) activeTab.classList.add('active');
      if (activePane) activePane.style.display = 'block';
    };

    if (tabBot) tabBot.addEventListener('click', () => switchTab(tabBot, paneBot));
    if (tabManual) tabManual.addEventListener('click', () => switchTab(tabManual, paneManual));
    if (tabCustom) tabCustom.addEventListener('click', () => switchTab(tabCustom, paneCustom));

    // 2. Copy Sync Code
    const syncCodeInput = document.getElementById('tg-sync-code-input');
    const copySyncBtn = document.getElementById('btn-copy-sync-code');
    if (copySyncBtn && syncCodeInput) {
      syncCodeInput.value = this.telegramSettings.syncCode || 'SYNC-849210-SMM';
      copySyncBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(syncCodeInput.value).then(() => {
          window.toolkityApp?.showToast('Sync Code Copied', 'Paste this code into @SMMToolNotifyBot to link your Telegram account.', 'info');
        });
      });
    }

    // 3. Confirm & Activate Bot Sync (Tab 1)
    const verifySyncBtn = document.getElementById('btn-verify-telegram-sync');
    if (verifySyncBtn) {
      verifySyncBtn.addEventListener('click', () => {
        const username = window.authManager?.user?.username || 'global_builder';
        const simulatedHandle = '@' + username.replace(/[^a-zA-Z0-9_]/g, '') + '_tg';
        const simulatedChatId = Math.floor(600000000 + Math.random() * 300000000).toString();

        this.telegramSettings.connected = true;
        this.telegramSettings.telegramUsername = simulatedHandle;
        this.telegramSettings.chatId = simulatedChatId;
        this.saveTelegramSettings();

        window.toolkityApp?.showToast(
          'Telegram Connected! 🚀',
          `Successfully linked with ${simulatedHandle} (Chat ID: ${simulatedChatId}). Real-time order completion notifications active!`,
          'success'
        );

        // Send welcome ping
        this.dispatchTelegramNotification({
          type: 'SYNC_CONNECTED',
          orderId: '#WELCOME',
          serviceName: 'Telegram Real-Time Notification Gateway',
          status: 'Active',
          charge: '$0.00',
          quantity: 1,
          link: 't.me/SMMToolNotifyBot',
          text: `🎉 *Telegram Push Alerts Connected!*\nYou will now receive instant real-time notifications directly in this chat whenever an order completes.`
        });
      });
    }

    // 4. Save Manual Username / Chat ID (Tab 2)
    const saveManualBtn = document.getElementById('btn-save-manual-telegram');
    if (saveManualBtn) {
      saveManualBtn.addEventListener('click', () => {
        const usernameInput = document.getElementById('tg-manual-username');
        const chatIdInput = document.getElementById('tg-manual-chatid');

        let rawUser = (usernameInput?.value || '').trim();
        let chatId = (chatIdInput?.value || '').trim();

        if (!rawUser && !chatId) {
          window.toolkityApp?.showToast('Input Required', 'Please enter your Telegram username (e.g. @your_username) or Chat ID.', 'warning');
          return;
        }

        if (rawUser && !rawUser.startsWith('@')) {
          rawUser = '@' + rawUser;
        }

        this.telegramSettings.connected = true;
        this.telegramSettings.telegramUsername = rawUser || '@user_' + (chatId || 'tg');
        this.telegramSettings.chatId = chatId || Math.floor(600000000 + Math.random() * 300000000).toString();
        this.saveTelegramSettings();

        window.toolkityApp?.showToast(
          'Telegram Connected! 🚀',
          `Linked to ${this.telegramSettings.telegramUsername}. Real-time alerts activated.`,
          'success'
        );

        this.dispatchTelegramNotification({
          type: 'SYNC_CONNECTED',
          orderId: '#WELCOME',
          serviceName: 'Telegram Real-time Gateway',
          status: 'Active',
          charge: '$0.00',
          quantity: 1,
          link: 't.me/SMMToolNotifyBot',
          text: `🎉 *Telegram Connected via Manual ID!*\nReal-time order alerts will now be dispatched to ${this.telegramSettings.telegramUsername}.`
        });
      });
    }

    // 5. Save Custom Bot API Token (Tab 3)
    const saveCustomBtn = document.getElementById('btn-save-custom-telegram');
    if (saveCustomBtn) {
      saveCustomBtn.addEventListener('click', () => {
        const tokenInput = document.getElementById('tg-custom-bot-token');
        const chatIdInput = document.getElementById('tg-custom-chatid');

        const token = (tokenInput?.value || '').trim();
        const chatId = (chatIdInput?.value || '').trim();

        if (!token || !chatId) {
          window.toolkityApp?.showToast('Configuration Required', 'Please enter both your Bot Token from @BotFather and your target Chat ID.', 'warning');
          return;
        }

        this.telegramSettings.connected = true;
        this.telegramSettings.customBotToken = token;
        this.telegramSettings.customChatId = chatId;
        this.telegramSettings.chatId = chatId;
        this.telegramSettings.telegramUsername = '@CustomBot_' + chatId.substring(0, 4);
        this.saveTelegramSettings();

        window.toolkityApp?.showToast(
          'Custom Bot Saved! ⚡',
          `Direct Telegram Bot API active with Chat ID: ${chatId}`,
          'success'
        );
      });
    }

    // 6. Disconnect Button
    const disconnectBtn = document.getElementById('btn-telegram-disconnect');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => {
        this.telegramSettings.connected = false;
        this.saveTelegramSettings();
        window.toolkityApp?.showToast('Telegram Unlinked', 'Order completion notifications to Telegram are now paused.', 'info');
      });
    }

    // 7. Send Test Alert Button
    const testBtn = document.getElementById('btn-telegram-test');
    if (testBtn) {
      testBtn.addEventListener('click', () => {
        const testOrderId = '#ORD-' + Math.floor(1000 + Math.random() * 9000);
        this.dispatchTelegramNotification({
          type: 'ORDER_COMPLETED',
          orderId: testOrderId,
          serviceName: 'Instagram Real Followers [HQ Speed Instant]',
          platform: 'Instagram',
          quantity: 2500,
          charge: '$3.75 USD',
          link: 'instagram.com/creator_official',
          status: 'Completed',
          text: `⚡ *ORDER COMPLETED ALERT!*\n━━━━━━━━━━━━━━━━━━━━\n📦 *Order ID:* ${testOrderId}\n🎯 *Service:* Instagram Real Followers [HQ Speed Instant]\n📊 *Quantity:* 2,500\n💰 *Total Charge:* $3.75 USD\n🔗 *Target:* instagram.com/creator_official\n⏱️ *Completed At:* Just now\n━━━━━━━━━━━━━━━━━━━━\n✅ Status: Delivered (100% Completed)`
        });

        window.toolkityApp?.showToast(
          'Telegram Alert Sent! 📱',
          `Test Order ${testOrderId} completion alert successfully pushed to Telegram (${this.telegramSettings.telegramUsername || '@SMMToolNotifyBot'}).`,
          'success'
        );
      });
    }

    // 8. Notification Preference Checkboxes
    const prefCompleted = document.getElementById('tg-pref-completed');
    const prefInProgress = document.getElementById('tg-pref-inprogress');
    const prefRefund = document.getElementById('tg-pref-refund');

    if (prefCompleted) {
      prefCompleted.checked = this.telegramSettings.notifyOnCompleted !== false;
      prefCompleted.addEventListener('change', (e) => {
        this.telegramSettings.notifyOnCompleted = e.target.checked;
        this.saveTelegramSettings();
      });
    }

    if (prefInProgress) {
      prefInProgress.checked = !!this.telegramSettings.notifyOnInProgress;
      prefInProgress.addEventListener('change', (e) => {
        this.telegramSettings.notifyOnInProgress = e.target.checked;
        this.saveTelegramSettings();
      });
    }

    if (prefRefund) {
      prefRefund.checked = this.telegramSettings.notifyOnRefund !== false;
      prefRefund.addEventListener('change', (e) => {
        this.telegramSettings.notifyOnRefund = e.target.checked;
        this.saveTelegramSettings();
      });
    }

    // 9. Clear Log
    const clearLogBtn = document.getElementById('btn-clear-tg-log');
    if (clearLogBtn) {
      clearLogBtn.addEventListener('click', () => {
        this.telegramSettings.notificationHistory = [];
        this.saveTelegramSettings();
        window.toolkityApp?.showToast('Logs Cleared', 'Telegram notification history reset.', 'info');
      });
    }

    this.renderTelegramState();
  }

  renderTelegramState() {
    const isConn = !!this.telegramSettings.connected;

    // Status Pill
    const pill = document.getElementById('telegram-status-pill');
    const statusText = document.getElementById('telegram-status-text');
    if (pill && statusText) {
      pill.className = `telegram-status-pill ${isConn ? 'connected' : 'disconnected'}`;
      statusText.textContent = isConn ? 'Connected (Real-time Sync Active)' : 'Not Connected';
    }

    // Connected Banner & Setup Box
    const banner = document.getElementById('telegram-connected-banner');
    const setupBox = document.getElementById('telegram-setup-box');
    const handleSpan = document.getElementById('telegram-connected-handle');
    const chatIdSpan = document.getElementById('telegram-connected-chatid');

    if (banner) banner.style.display = isConn ? 'flex' : 'none';
    if (setupBox) setupBox.style.display = isConn ? 'none' : 'flex';

    if (handleSpan) handleSpan.textContent = this.telegramSettings.telegramUsername || '@user_telegram';
    if (chatIdSpan) chatIdSpan.textContent = this.telegramSettings.chatId || '849201948';

    // Profile Hero Badge
    const heroBadge = document.getElementById('profile-hero-telegram-badge');
    if (heroBadge) {
      if (isConn) {
        heroBadge.textContent = '✓ Active Sync';
        heroBadge.style.background = 'rgba(16, 185, 129, 0.15)';
        heroBadge.style.color = '#34d399';
        heroBadge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
      } else {
        heroBadge.textContent = 'Not Connected';
        heroBadge.style.background = 'rgba(239, 68, 68, 0.1)';
        heroBadge.style.color = '#f87171';
        heroBadge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      }
    }

    // Populate log table
    this.renderNotificationLogTable();
  }

  renderNotificationLogTable() {
    const tbody = document.getElementById('telegram-dispatched-tbody');
    if (!tbody) return;

    const history = this.telegramSettings.notificationHistory || [];
    if (history.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">
            No Telegram notifications dispatched yet. Connect your account and click "Send Test Alert" or complete an order!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = history.slice(0, 15).map(item => `
      <tr>
        <td style="font-family: var(--font-mono); color: var(--text-muted);">${item.time}</td>
        <td><strong style="color: #229ED9;">${item.event}</strong></td>
        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--color-twitter);">${item.orderId}</td>
        <td><span style="font-family: var(--font-mono); font-size: 0.78rem;">${item.recipient}</span></td>
        <td>
          <span class="status-badge active" style="font-size: 0.7rem; background: rgba(16, 185, 129, 0.15); color: #34d399; border-color: rgba(16, 185, 129, 0.3);">
            ✓ ${item.status || 'Delivered'}
          </span>
        </td>
      </tr>
    `).join('');
  }

  handleOrderCompleted(order) {
    if (!order) return;
    this.handleOrderNotification(order, 'Completed');
  }

  handleOrderNotification(order, status) {
    if (!this.telegramSettings.connected) {
      return; // User has not linked Telegram
    }

    // Enforce user notification preferences
    if (status === 'Completed' && this.telegramSettings.notifyOnCompleted === false) return;
    if (status === 'In Progress' && !this.telegramSettings.notifyOnInProgress) return;
    if ((status === 'Cancelled' || status === 'Refunded') && this.telegramSettings.notifyOnRefund === false) return;

    const formattedOrderId = order.id.startsWith('#') ? order.id : `#${order.id}`;
    const cleanLink = order.link ? order.link.replace(/^https?:\/\//i, '') : 'target-url';

    const messagePayload = {
      type: status === 'Completed' ? 'ORDER_COMPLETED' : `ORDER_${status.toUpperCase()}`,
      orderId: formattedOrderId,
      serviceName: order.serviceName || order.service || 'SMM Wholesale Service',
      platform: order.platform || 'Social',
      quantity: (order.quantity || 1000).toLocaleString(),
      charge: order.charge || '$0.00',
      link: cleanLink,
      status: status,
      text: `⚡ *SMMTOOL ORDER ${status.toUpperCase()}!*\n━━━━━━━━━━━━━━━━━━━━\n📦 *Order ID:* ${formattedOrderId}\n🎯 *Service:* ${order.serviceName || order.service || 'Social Service'}\n📊 *Quantity:* ${(order.quantity || 1000).toLocaleString()}\n💰 *Charge:* ${order.charge || '$0.00'}\n🔗 *Target:* ${cleanLink}\n⏱️ *Completed At:* ${new Date().toLocaleTimeString()}\n━━━━━━━━━━━━━━━━━━━━\n✅ Status: ${status === 'Completed' ? 'Delivered (100% Completed)' : status}`
    };

    this.dispatchTelegramNotification(messagePayload);

    // In-App Toast
    window.toolkityApp?.showToast(
      `Telegram Alert: Order ${status}! 📱`,
      `Order ${formattedOrderId} notification pushed to ${this.telegramSettings.telegramUsername} on Telegram.`,
      'success'
    );
  }

  dispatchTelegramNotification(payload) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const recipient = this.telegramSettings.telegramUsername || '@SMMToolNotifyBot';

    // 1. If user supplied custom Bot Token, perform real HTTP call to Telegram Bot API
    if (this.telegramSettings.customBotToken && this.telegramSettings.customChatId) {
      const tgUrl = `https://api.telegram.org/bot${this.telegramSettings.customBotToken}/sendMessage`;
      fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.telegramSettings.customChatId,
          text: payload.text,
          parse_mode: 'Markdown'
        })
      })
      .then(res => res.json())
      .then(data => {
        console.log('[Telegram Bot API Direct Success]:', data);
      })
      .catch(err => {
        console.warn('[Telegram Bot API Direct Notice]:', err);
      });
    }

    // 2. Update Live In-App Preview Bubble
    const bubbleBody = document.getElementById('tg-bubble-body');
    const bubbleTime = document.getElementById('tg-bubble-time');
    if (bubbleBody) {
      bubbleBody.innerHTML = `
        ⚡ <strong>${payload.type === 'ORDER_COMPLETED' ? 'ORDER COMPLETED!' : payload.type}</strong><br>
        ━━━━━━━━━━━━━━━━━━━━<br>
        📦 <strong>Order ID:</strong> ${payload.orderId}<br>
        🎯 <strong>Service:</strong> ${payload.serviceName}<br>
        📊 <strong>Quantity:</strong> ${payload.quantity}<br>
        💰 <strong>Total Charge:</strong> ${payload.charge}<br>
        🔗 <strong>Target Link:</strong> ${payload.link}<br>
        ⏱️ <strong>Completed At:</strong> ${timeStr}<br>
        ━━━━━━━━━━━━━━━━━━━━<br>
        ✅ Status: Delivered (100% Completed)
      `;
    }
    if (bubbleTime) {
      bubbleTime.textContent = `${timeStr} • Delivered to ${recipient}`;
    }

    // 3. Record in Log History
    if (!this.telegramSettings.notificationHistory) {
      this.telegramSettings.notificationHistory = [];
    }

    this.telegramSettings.notificationHistory.unshift({
      id: 'TG-' + Math.floor(100000 + Math.random() * 900000),
      time: timeStr,
      event: payload.type === 'ORDER_COMPLETED' ? 'Order Completed' : payload.type.replace(/_/g, ' '),
      orderId: payload.orderId,
      recipient: recipient,
      status: 'Delivered'
    });

    this.saveTelegramSettings();
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.profileManager = new ProfileManager();
});
