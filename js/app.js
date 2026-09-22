/* Toolkity Next - Main Application Controller */

class ToolkityApp {
  constructor() {
    this.currentView = 'dashboard';
    this.audioCtx = null;

    this.init();
  }

  init() {
    this.setupTheme();
    this.setupNavigation();
    this.setupAccordions();
    this.setupKeyboardShortcuts();
    this.setupGlobalSearch();
    this.setupMobileSidebar();
    this.setupServicesCatalog();
  }

  // Tasteful subtle audio feedback for interactions
  playAudioBeep(freq = 600, type = 'sine', duration = 0.04) {
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.audioCtx = new AudioContext();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      if (this.audioCtx) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
      }
    } catch (e) {
      // Audio autoplay gracefully handled
    }
  }

  // Theme Management (Dark / Light)
  setupTheme() {
    const savedTheme = localStorage.getItem('toolkity_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const nextTheme = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('toolkity_theme', nextTheme);
        this.updateThemeIcon(nextTheme);
        this.playAudioBeep(750);
        this.showToast('Theme Changed', `Switched to ${nextTheme} mode`, 'info');
      });
    }
  }

  updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    if (theme === 'light') {
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `;
      btn.title = "Switch to Dark Mode";
    } else {
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      `;
      btn.title = "Switch to Light Mode";
    }
  }

  // Navigation & View Routing
  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[data-view]');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.getAttribute('data-view');
        this.switchView(view);
        this.closeMobileSidebar();
      });
    });

    // Check URL hash if present
    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(`view-${hash}`)) {
      this.switchView(hash);
    }
  }

  switchView(viewName) {
    const targetEl = document.getElementById(`view-${viewName}`);
    if (!targetEl) return;

    // Update active nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.getAttribute('data-view') === viewName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Toggle active view containers
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active-view'));
    targetEl.classList.add('active-view');
    this.currentView = viewName;
    window.location.hash = viewName;

    // Scroll back to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.playAudioBeep(520);
  }

  // Mobile Sidebar Drawer
  setupMobileSidebar() {
    const toggleBtn = document.getElementById('sidebar-toggle-top');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (toggleBtn && sidebar && overlay) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
      });

      overlay.addEventListener('click', () => {
        this.closeMobileSidebar();
      });
    }
  }

  closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
  }

  // SEO Strategy Accordions
  setupAccordions() {
    const accordionTriggers = document.querySelectorAll('.accordion-trigger');
    accordionTriggers.forEach(trigger => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('.accordion-item');
        if (!item) return;
        item.classList.toggle('open');
        this.playAudioBeep(640);
      });
    });
  }

  // Global Search & Quick Launch
  setupGlobalSearch() {
    const searchInput = document.getElementById('topbar-global-search');
    if (!searchInput) return;

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.toLowerCase().trim();
        if (query.includes('follow')) this.switchView('twitter-followers');
        else if (query.includes('unfollow')) this.switchView('twitter-unfollow');
        else if (query.includes('retweet')) this.switchView('twitter-retweet');
        else if (query.includes('like')) this.switchView('twitter-like');
        else if (query.includes('dm') || query.includes('message')) this.switchView('twitter-dm-cleaner');
        else if (query.includes('delete') || query.includes('tweet')) this.switchView('delete-all-tweets');
        else if (query.includes('insta') || query.includes('tag')) this.switchView('instagram-tools');
        else if (query.includes('you') || query.includes('seo')) this.switchView('youtube-tools');
        else if (query.includes('crypto') || query.includes('vip') || query.includes('pay')) {
          if (window.cryptoPaymentModal) window.cryptoPaymentModal.open();
        } else {
          this.showToast('Search', `Showing results for "${query}" on dashboard`, 'info');
          this.switchView('dashboard');
        }
        searchInput.blur();
      }
    });
  }

  // Keyboard Shortcuts (e.g. Ctrl + K or Cmd + K)
  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('topbar-global-search');
        if (searchInput) searchInput.focus();
      }
      if (e.key === 'Escape') {
        if (window.cryptoPaymentModal) window.cryptoPaymentModal.close();
        this.closeMobileSidebar();
      }
    });
  }

  // Toast Notification System
  showToast(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSymbol = 'ℹ️';
    if (type === 'success') iconSymbol = '✓';
    if (type === 'warning') iconSymbol = '⚠️';

    toast.innerHTML = `
      <div class="toast-icon">${iconSymbol}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;

    container.appendChild(toast);
    this.playAudioBeep(type === 'success' ? 880 : 540);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      setTimeout(() => toast.remove(), 250);
    }, 4200);
  }

  // SMM Services Catalog (SMMTOOL Wholesale pricing in $ USD)
  setupServicesCatalog() {
    this.servicesTableBody = document.getElementById('smm-services-tbody');
    this.servicesFilterContainer = document.getElementById('services-filter-pills');
    this.servicesSearchInput = document.getElementById('services-search-input');

    if (!this.servicesTableBody || !TOOLKITY_DATA.smmServices) return;

    this.activeServiceCategory = 'all';
    this.renderServicesCatalog();

    window.addEventListener('services:updated', () => {
      this.renderServicesCatalog();
    });

    if (this.servicesFilterContainer) {
      this.servicesFilterContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.services-filter-btn');
        if (!btn) return;
        this.servicesFilterContainer.querySelectorAll('.services-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeServiceCategory = btn.getAttribute('data-category');
        this.renderServicesCatalog();
      });
    }

    if (this.servicesSearchInput) {
      this.servicesSearchInput.addEventListener('input', () => {
        this.renderServicesCatalog();
      });
    }
  }

  renderServicesCatalog() {
    if (!this.servicesTableBody || !TOOLKITY_DATA.smmServices) return;

    const query = (this.servicesSearchInput?.value || '').toLowerCase().trim();
    const category = this.activeServiceCategory || 'all';

    const filtered = TOOLKITY_DATA.smmServices.filter(s => {
      let matchCat = category === 'all' || s.platform.toLowerCase() === category.toLowerCase();
      if (category === 'music' && (s.platform.toLowerCase() === 'soundcloud' || s.platform.toLowerCase() === 'audiomack')) {
        matchCat = true;
      }
      const matchQuery = !query || s.name.toLowerCase().includes(query) || s.category.toLowerCase().includes(query) || s.platform.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });

    if (filtered.length === 0) {
      this.servicesTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            No high quality services found matching your search.
          </td>
        </tr>
      `;
      return;
    }

    const currentLimit = query ? filtered.length : (this.catalogDisplayLimit || 60);
    const displayed = filtered.slice(0, currentLimit);

    let rowsHtml = displayed.map(s => {
      const isPaused = s.status === 'paused';
      const rateFormatted = s.ratePer1000 < 0.1 ? s.ratePer1000.toFixed(3) : s.ratePer1000.toFixed(2);
      return `
        <tr class="${isPaused ? 'row-paused' : ''}">
          <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">#${s.id}</td>
          <td>
            <span class="status-badge ${s.platform.toLowerCase()}">
              ${s.platform}
            </span>
          </td>
          <td>
            <div>
              <strong style="color: var(--text-primary); font-size: 0.88rem;">
                ${s.name}
                ${isPaused ? '<span class="status-badge paused" style="margin-left: 0.35rem; font-size: 0.68rem;">PAUSED</span>' : ''}
              </strong>
              <div style="font-size: 0.74rem; color: var(--text-muted);">${s.category} • ${s.description}</div>
            </div>
          </td>
          <td>
            <span class="service-rate-usd-tag">$${rateFormatted}</span>
            <span style="font-size: 0.7rem; color: var(--text-muted); display: block;">/ 1,000 units</span>
          </td>
          <td style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-secondary);">
            ${s.min.toLocaleString()} / ${s.max.toLocaleString()}
          </td>
          <td>
            <span class="service-speed-tag ${isPaused ? 'paused' : ''}">⚡ ${s.speed}</span>
          </td>
          <td>
            ${isPaused ? `
              <button type="button" class="btn-launch-tool" style="padding: 0.4rem 0.85rem; font-size: 0.78rem; width: auto; opacity: 0.5; cursor: not-allowed;" disabled>
                <span>Paused</span>
              </button>
            ` : `
              <button type="button" class="btn-launch-tool" style="padding: 0.4rem 0.85rem; font-size: 0.78rem; width: auto;" onclick="window.ordersManager?.selectServiceFromCatalog(${s.id})">
                <span>Order ($)</span>
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');

    if (filtered.length > currentLimit) {
      rowsHtml += `
        <tr>
          <td colspan="7" style="text-align: center; padding: 1.25rem;">
            <button type="button" class="platform-action-btn" id="btn-load-more-services" style="padding: 0.6rem 1.5rem; font-size: 0.84rem;">
              <span>⚡ Load More Services (Showing ${currentLimit} of ${filtered.length})</span>
            </button>
          </td>
        </tr>
      `;
    }

    this.servicesTableBody.innerHTML = rowsHtml;

    const btnLoadMore = document.getElementById('btn-load-more-services');
    if (btnLoadMore) {
      btnLoadMore.addEventListener('click', () => {
        this.catalogDisplayLimit = (this.catalogDisplayLimit || 60) + 60;
        this.renderServicesCatalog();
      });
    }
  }

  viewMemberProfile(handle) {
    this.showToast('Peer Selected', `Selected active node @${handle} for mutual exchange`, 'info');
  }
}

// Global bootstrap
document.addEventListener('DOMContentLoaded', () => {
  window.toolkityApp = new ToolkityApp();
});
