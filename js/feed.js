/* Toolkity Next - Live Member Feed & Real-time Telemetry */

class LiveFeedController {
  constructor() {
    this.tableBody = document.getElementById('live-members-tbody');
    this.searchInput = document.getElementById('member-feed-search');
    this.totalMembersEl = document.getElementById('stat-total-members');
    this.activeNodesEl = document.getElementById('stat-active-nodes');
    this.dailyGrowthEl = document.getElementById('stat-daily-growth');
    this.clusterPingEl = document.getElementById('cluster-ping');

    this.members = [...TOOLKITY_DATA.members];
    this.pool = [...TOOLKITY_DATA.feedPool];
    this.init();
  }

  init() {
    this.renderTable();
    this.initStats();
    this.setupSearch();
    this.startLiveSimulation();
  }

  initStats() {
    if (this.totalMembersEl) this.totalMembersEl.textContent = TOOLKITY_DATA.stats.totalMembers.toLocaleString();
    if (this.activeNodesEl) this.activeNodesEl.textContent = TOOLKITY_DATA.stats.activeNodes.toLocaleString();
    if (this.dailyGrowthEl) this.dailyGrowthEl.textContent = `+${TOOLKITY_DATA.stats.dailyGrowth.toLocaleString()}`;
  }

  renderTable(filterText = '') {
    if (!this.tableBody) return;

    const filtered = this.members.filter(m => {
      if (!filterText) return true;
      const q = filterText.toLowerCase();
      return m.handle.toLowerCase().includes(q) ||
             m.name.toLowerCase().includes(q) ||
             m.bio.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);">
            No members found matching "${filterText}"
          </td>
        </tr>
      `;
      return;
    }

    this.tableBody.innerHTML = filtered.map(m => `
      <tr data-id="${m.id}" class="member-row">
        <td>
          <div class="table-user-cell">
            <div class="user-avatar-wrapper">
              <img src="${m.avatar}" class="user-avatar" alt="${m.name}" loading="lazy">
              <span class="online-indicator-dot"></span>
            </div>
            <div class="user-names">
              <span class="user-handle">
                @${m.handle}
                ${m.verified ? `
                  <svg class="verified-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                ` : ''}
              </span>
              <span class="user-bio">${m.bio || 'Active peer in community pool'}</span>
            </div>
          </div>
        </td>
        <td><strong style="color: var(--text-primary); font-family: var(--font-mono);">${m.followers}</strong></td>
        <td>
          <span class="status-badge ${m.status.toLowerCase()}">
            <span class="pulse-dot" style="width: 6px; height: 6px;"></span>
            ${m.status}
          </span>
        </td>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${m.joinedAt}</td>
        <td>
          <button class="platform-action-btn" style="padding: 4px 10px; font-size: 0.75rem;" onclick="window.toolkityApp.viewMemberProfile('${m.handle}')">
            Profile
          </button>
        </td>
      </tr>
    `).join('');
  }

  setupSearch() {
    if (!this.searchInput) return;
    this.searchInput.addEventListener('input', (e) => {
      this.renderTable(e.target.value.trim());
    });
  }

  startLiveSimulation() {
    // Inject a simulated new member every 12 to 20 seconds
    setInterval(() => {
      if (this.pool.length === 0) return;
      
      const newPeer = this.pool[Math.floor(Math.random() * this.pool.length)];
      const randomId = Date.now();
      const avatars = [
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&auto=format&fit=crop&q=80"
      ];
      const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

      const memberObj = {
        id: randomId,
        handle: `${newPeer.handle}_${Math.floor(Math.random() * 90 + 10)}`,
        name: newPeer.name,
        avatar: randomAvatar,
        bio: newPeer.bio,
        followers: `${(Math.random() * 40 + 2).toFixed(1)}K`,
        status: "Active",
        verified: newPeer.verified,
        joinedAt: "Just now"
      };

      // Add to front of list
      this.members.unshift(memberObj);
      if (this.members.length > 15) this.members.pop();

      // Render updated list
      const query = this.searchInput ? this.searchInput.value.trim() : '';
      this.renderTable(query);

      // Increment stats slightly
      TOOLKITY_DATA.stats.totalMembers += 1;
      TOOLKITY_DATA.stats.activeNodes += Math.random() > 0.4 ? 1 : 0;
      if (this.totalMembersEl) this.totalMembersEl.textContent = TOOLKITY_DATA.stats.totalMembers.toLocaleString();
      if (this.activeNodesEl) this.activeNodesEl.textContent = TOOLKITY_DATA.stats.activeNodes.toLocaleString();

      // Fluctuate ping slightly (34ms - 42ms)
      const ping = Math.floor(Math.random() * 8 + 34);
      if (this.clusterPingEl) this.clusterPingEl.textContent = `${ping}ms`;

    }, 14000);
  }
}

// Initialize feed controller on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.liveFeedController = new LiveFeedController();
});
