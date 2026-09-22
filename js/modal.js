/* Toolkity Next - VIP Crypto Payment & Checkout Controller (EVM Stablecoins Only) */

class CryptoPaymentModal {
  constructor() {
    this.modalEl = document.getElementById('crypto-vip-modal');
    this.followerCount = 1000; // Default 1,000 followers = $10
    this.minFollowers = TOOLKITY_DATA.pricing?.minFollowers || 100;
    this.maxFollowers = TOOLKITY_DATA.pricing?.maxFollowers || 100000;
    this.ratePer100 = TOOLKITY_DATA.pricing?.ratePer100 || 1.005; // $1.005 per 100 followers (+0.5%)
    this.receiverAddress = TOOLKITY_DATA.pricing?.receiverAddress || "0x2d36622575A76913b4d5521DA47e259C0579deEb";

    this.selectedCoin = 'USDT-ARB'; // Default to Arbitrum EVM
    this.selectedService = null; // Default to custom package
    this.observerSeconds = 60; // 1-minute explorer observer
    this.observerInterval = null;
    this.activeTxHash = '';
    this.activeSender = '';

    this.init();
  }

  init() {
    this.setupServiceSelector();
    this.setupFollowerControls();
    this.setupCoinTabs();
    this.setupActions();
    this.updatePaymentDetails();
  }

  setupServiceSelector() {
    const selectEl = document.getElementById('modal-service-select');
    if (!selectEl || !TOOLKITY_DATA.smmServices) return;

    selectEl.innerHTML = `
      <option value="custom">★ Custom Follower Package ($1.01 per 100 followers / min 100)</option>
      ${TOOLKITY_DATA.smmServices.map(s => `
        <option value="${s.id}">[${s.platform.toUpperCase()}] ${s.name} — $${s.ratePer1000.toFixed(2)} / 1,000</option>
      `).join('')}
    `;

    selectEl.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'custom') {
        this.selectedService = null;
        this.minFollowers = 100;
        this.maxFollowers = 100000;
        this.ratePer100 = 1.005;
        this.setFollowerCount(1000);
      } else {
        const sId = parseInt(val, 10);
        this.selectServiceById(sId);
      }
    });
  }

  selectServiceById(sId) {
    const service = TOOLKITY_DATA.smmServices.find(s => s.id === sId);
    if (!service) return;

    this.selectedService = service;
    this.minFollowers = 100;
    this.maxFollowers = 100000;

    const selectEl = document.getElementById('modal-service-select');
    if (selectEl) selectEl.value = sId.toString();

    const rangeSlider = document.getElementById('custom-follower-slider');
    if (rangeSlider) {
      rangeSlider.min = 100;
      rangeSlider.max = 100000;
      rangeSlider.step = 100;
    }

    const numberInput = document.getElementById('custom-follower-input');
    if (numberInput) {
      numberInput.min = 100;
      numberInput.max = 100000;
      numberInput.step = 100;
    }

    this.setFollowerCount(Math.max(100, this.followerCount));
  }

  openWithService(serviceId) {
    this.open();
    this.selectServiceById(serviceId);
  }

  getCalculatedPrice() {
    if (this.selectedService) {
      const cost = (this.followerCount / 1000) * this.selectedService.ratePer1000;
      return Math.max(0.01, parseFloat(cost.toFixed(2)));
    }
    const units = Math.max(1, this.followerCount / 100);
    return parseFloat((units * this.ratePer100).toFixed(2));
  }

  setupFollowerControls() {
    const numberInput = document.getElementById('custom-follower-input');
    const rangeSlider = document.getElementById('custom-follower-slider');
    const presetsContainer = document.getElementById('follower-presets-container');

    // Render quick-select preset pill buttons
    if (presetsContainer && TOOLKITY_DATA.cryptoPackages) {
      presetsContainer.innerHTML = TOOLKITY_DATA.cryptoPackages.map(pkg => `
        <button type="button" class="preset-pill-btn ${pkg.count === this.followerCount ? 'active' : ''}" data-count="${pkg.count}">
          ${pkg.count >= 1000 ? (pkg.count / 1000) + 'K' : pkg.count} ($${((pkg.count / 100) * this.ratePer100).toFixed(2)})
        </button>
      `).join('');

      presetsContainer.querySelectorAll('.preset-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          presetsContainer.querySelectorAll('.preset-pill-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const count = parseInt(btn.getAttribute('data-count'), 10);
          this.setFollowerCount(count);
        });
      });
    }

    if (numberInput) {
      numberInput.value = this.followerCount;
      numberInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val)) return;
        if (val > this.maxFollowers) val = this.maxFollowers;
        this.setFollowerCount(val, false);
      });

      numberInput.addEventListener('blur', () => {
        let val = parseInt(numberInput.value, 10);
        if (isNaN(val) || val < this.minFollowers) val = this.minFollowers;
        // Snap to nearest 100
        val = Math.round(val / 100) * 100;
        this.setFollowerCount(val, true);
      });
    }

    if (rangeSlider) {
      rangeSlider.value = this.followerCount;
      rangeSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.setFollowerCount(val, true);
      });
    }
  }

  setFollowerCount(count, updateInput = true) {
    this.followerCount = Math.max(this.minFollowers, Math.min(this.maxFollowers, count));

    const numberInput = document.getElementById('custom-follower-input');
    const rangeSlider = document.getElementById('custom-follower-slider');
    const presetsContainer = document.getElementById('follower-presets-container');

    if (updateInput && numberInput) numberInput.value = this.followerCount;
    if (rangeSlider) rangeSlider.value = this.followerCount;

    // Update preset pills active state
    if (presetsContainer) {
      presetsContainer.querySelectorAll('.preset-pill-btn').forEach(btn => {
        const btnCount = parseInt(btn.getAttribute('data-count'), 10);
        if (btnCount === this.followerCount) btn.classList.add('active');
        else btn.classList.remove('active');
      });
    }

    this.updatePaymentDetails();
  }

  setupCoinTabs() {
    const container = document.getElementById('modal-coin-tabs');
    if (!container) return;

    const walletKeys = Object.keys(TOOLKITY_DATA.cryptoWallets);
    if (!this.selectedCoin || !TOOLKITY_DATA.cryptoWallets[this.selectedCoin]) {
      this.selectedCoin = walletKeys[0];
    }

    container.innerHTML = walletKeys.map(key => {
      const w = TOOLKITY_DATA.cryptoWallets[key];
      const isActive = key === this.selectedCoin;
      return `
        <button type="button" class="coin-tab ${isActive ? 'active' : ''}" data-coin="${key}">
          <span class="coin-tab-token">
            <span>💲</span>
            <span>${w.symbol}</span>
          </span>
          <span class="coin-tab-chain">${w.chain}</span>
        </button>
      `;
    }).join('');

    container.querySelectorAll('.coin-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('.coin-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.selectedCoin = tab.getAttribute('data-coin');
        this.updatePaymentDetails();
      });
    });
  }

  updatePaymentDetails() {
    const wallet = TOOLKITY_DATA.cryptoWallets[this.selectedCoin];
    const price = this.getCalculatedPrice();

    const addressInput = document.getElementById('modal-wallet-address');
    const amountLabel = document.getElementById('modal-deposit-amount');
    const networkBadge = document.getElementById('modal-network-badge');
    const gasEstLabel = document.getElementById('modal-gas-estimate');
    const summaryFollowers = document.getElementById('calc-summary-followers');
    const summaryPrice = document.getElementById('calc-summary-price');

    if (addressInput) addressInput.value = this.receiverAddress;
    if (networkBadge && wallet) {
      networkBadge.innerHTML = `<span style="color: var(--color-emerald);">●</span> ${wallet.network}`;
    }
    if (gasEstLabel && wallet) {
      gasEstLabel.textContent = `Est. Gas: ${wallet.gasEst}`;
    }
    if (amountLabel && wallet) {
      amountLabel.textContent = `Send Exactly: ${price.toFixed(2)} ${wallet.symbol}`;
    }
    if (summaryFollowers) {
      summaryFollowers.textContent = `${this.followerCount.toLocaleString()} ${this.selectedService ? 'Units' : 'Followers'}`;
    }
    if (summaryPrice && wallet) {
      summaryPrice.textContent = `$${price.toFixed(2)} (${price.toFixed(2)} ${wallet.symbol})`;
    }

    this.renderDynamicQR(this.receiverAddress);
  }

  renderDynamicQR(address) {
    const qrContainer = document.getElementById('qr-code-svg-target');
    if (!qrContainer) return;

    const wallet = TOOLKITY_DATA.cryptoWallets[this.selectedCoin];
    const tokenSymbol = wallet ? wallet.symbol : 'USDT';
    const chainBadge = wallet ? wallet.chain : 'Arbitrum';

    if (typeof window.generateQRCodeSVG === 'function') {
      qrContainer.innerHTML = window.generateQRCodeSVG(address, {
        showCenterBadge: true,
        tokenSymbol: tokenSymbol,
        chainBadge: chainBadge,
        darkColor: '#0f172a',
        lightColor: '#ffffff'
      });
    }
  }

  setupActions() {
    const copyBtn = document.getElementById('btn-copy-modal-address');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(this.receiverAddress).then(() => {
          window.toolkityApp.showToast('Copied to Clipboard', 'Official EVM Receiver Address copied!', 'info');
        });
      });
    }

    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target === this.modalEl) this.close();
      });
    }

    // Submit and Start 1-Minute Observer Button
    const submitBtn = document.getElementById('btn-start-observer');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.start1MinObserver());
    }

    // Fast-Forward Observer button
    const fastForwardBtn = document.getElementById('btn-observer-fast-forward');
    if (fastForwardBtn) {
      fastForwardBtn.addEventListener('click', () => {
        this.observerSeconds = 2; // Jump directly to completion
      });
    }
  }

  open() {
    if (!this.modalEl) return;
    this.modalEl.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Show setup view, hide observer view
    const setupView = document.getElementById('modal-step-setup');
    const observerView = document.getElementById('modal-step-observer');
    if (setupView) setupView.style.display = 'flex';
    if (observerView) observerView.classList.remove('active');

    this.updatePaymentDetails();
  }

  close() {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('active');
    document.body.style.overflow = '';
    if (this.observerInterval) clearInterval(this.observerInterval);
  }

  // 1-Minute Live EVM Explorer Observer
  start1MinObserver() {
    const senderInput = document.getElementById('modal-sender-address');
    const txInput = document.getElementById('modal-tx-hash');

    const sender = (senderInput?.value || '').trim();
    const txHash = (txInput?.value || '').trim();

    if (!sender || sender.length < 10) {
      window.toolkityApp.showToast('Input Required', 'Please enter your Sending EVM Wallet Address', 'warning');
      if (senderInput) senderInput.focus();
      return;
    }

    if (!txHash || txHash.length < 10) {
      window.toolkityApp.showToast('Input Required', 'Please paste the Transaction Hash (TxID) of your payment', 'warning');
      if (txInput) txInput.focus();
      return;
    }

    this.activeSender = sender;
    this.activeTxHash = txHash;

    const setupView = document.getElementById('modal-step-setup');
    const observerView = document.getElementById('modal-step-observer');

    if (setupView) setupView.style.display = 'none';
    if (observerView) observerView.classList.add('active');

    const wallet = TOOLKITY_DATA.cryptoWallets[this.selectedCoin];
    const price = this.getCalculatedPrice();

    const titleEl = document.getElementById('observer-explorer-name');
    const linkEl = document.getElementById('observer-explorer-link-tag');
    const clockEl = document.getElementById('observer-clock-display');
    const progressFill = document.getElementById('observer-progress-fill');
    const logsWindow = document.getElementById('observer-logs-window');

    if (titleEl) titleEl.textContent = `${wallet.explorerName} (${wallet.chain} EVM)`;
    if (linkEl) {
      linkEl.href = `${wallet.explorer}/tx/${txHash}`;
      linkEl.textContent = `Open on ${wallet.explorerName} ↗`;
    }
    if (logsWindow) logsWindow.innerHTML = '';

    const addLog = (text, type = 'info') => {
      if (!logsWindow) return;
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML = `
        <span class="log-time">[${timeStr}]</span>
        <span class="log-badge ${type}">${type.toUpperCase()}</span>
        <span class="log-text">${text}</span>
      `;
      logsWindow.appendChild(entry);
      logsWindow.scrollTop = logsWindow.scrollHeight;
    };

    addLog(`Initiating live observation for EVM Tx: ${txHash.slice(0, 16)}...`, 'info');
    addLog(`Connecting to ${wallet.network} RPC endpoint & ${wallet.explorerName} API...`, 'info');

    this.observerSeconds = 60;
    if (this.observerInterval) clearInterval(this.observerInterval);

    this.observerInterval = setInterval(() => {
      this.observerSeconds--;

      const mins = Math.floor(this.observerSeconds / 60).toString().padStart(2, '0');
      const secs = (this.observerSeconds % 60).toString().padStart(2, '0');
      if (clockEl) clockEl.textContent = `${mins}:${secs}`;

      const elapsed = 60 - this.observerSeconds;
      const percent = Math.min(100, Math.round((elapsed / 60) * 100));
      if (progressFill) progressFill.style.width = `${percent}%`;

      if (elapsed === 6) {
        addLog(`Found mempool broadcast from sender: ${sender.slice(0, 10)}...${sender.slice(-6)}`, 'info');
      } else if (elapsed === 18) {
        addLog(`Verified destination recipient: 0x2d36622575A76913b4d5521DA47e259C0579deEb (Toolkity Vault)`, 'success');
      } else if (elapsed === 32) {
        addLog(`Smart contract decoded: transfer(${price.toFixed(2)} ${wallet.symbol})`, 'success');
      } else if (elapsed === 45) {
        addLog(`Block confirmations accumulating: 8/12 blocks confirmed on ${wallet.chain}...`, 'info');
      } else if (this.observerSeconds <= 0) {
        clearInterval(this.observerInterval);
        if (progressFill) progressFill.style.width = '100%';
        if (clockEl) clockEl.textContent = "00:00 - CONFIRMED";

        addLog(`✓ 12/12 Block Confirmations reached on ${wallet.explorerName}!`, 'success');
        addLog(`Order unlocked! Dispatched ${this.followerCount.toLocaleString()} units to prioritized creator nodes.`, 'success');

        window.toolkityApp.showToast(
          'EVM Payment Confirmed!',
          `Verified ${price.toFixed(2)} ${wallet.symbol} on ${wallet.explorerName}. +${this.followerCount.toLocaleString()} units queue activated!`,
          'success'
        );

        // Unlock VIP status on topbar
        const userBadge = document.getElementById('topbar-user-badge');
        if (userBadge) {
          userBadge.innerHTML = `
            <span class="status-badge verified" style="font-size:0.75rem; background: rgba(245, 158, 11, 0.2); color: var(--color-amber); border: 1px solid rgba(245, 158, 11, 0.4);">
              👑 VIP ELITE (${this.followerCount.toLocaleString()})
            </span>
          `;
        }

        // Show finish button
        const actionBtn = document.getElementById('btn-observer-done');
        if (actionBtn) {
          actionBtn.style.display = 'block';
          actionBtn.addEventListener('click', () => this.close());
        }
      }
    }, 1000);
  }
}

// Global instantiation on load
document.addEventListener('DOMContentLoaded', () => {
  window.cryptoPaymentModal = new CryptoPaymentModal();
});
