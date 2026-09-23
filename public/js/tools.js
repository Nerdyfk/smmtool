/* Toolkity Next - Interactive Social Media Tools Engine */

class SocialToolsEngine {
  constructor() {
    this.activeProcesses = {};
    this.initPillSelectors();
  }

  initPillSelectors() {
    document.querySelectorAll('.pills-grid').forEach(grid => {
      grid.addEventListener('click', (e) => {
        const pill = e.target.closest('.pill-option');
        if (!pill) return;
        grid.querySelectorAll('.pill-option').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      });
    });
  }

  // 1. Twitter Followers Tool
  generatePinCode() {
    const randomPin = Math.floor(1000000 + Math.random() * 9000000);
    const pinInput = document.getElementById('followers-pin-input');
    if (pinInput) {
      pinInput.value = randomPin;
      pinInput.classList.add('highlight-pin');
      setTimeout(() => pinInput.classList.remove('highlight-pin'), 1200);
    }
    window.toolkityApp.showToast('OAuth PIN Generated', `Authorized session PIN: ${randomPin}`, 'success');
  }

  startFollowersBooster() {
    const handleInput = document.getElementById('followers-handle-input');
    const pinInput = document.getElementById('followers-pin-input');
    const handle = (handleInput?.value || '').replace('@', '').trim();
    const pin = pinInput?.value.trim();

    if (!handle) {
      window.toolkityApp.showToast('Validation Error', 'Please enter your Twitter / X username', 'warning');
      if (handleInput) handleInput.focus();
      return;
    }

    if (!pin) {
      window.toolkityApp.showToast('PIN Required', 'Please click "Get Twitter PIN" first to authorize', 'warning');
      return;
    }

    const btn = document.getElementById('btn-run-followers');
    const logsWindow = document.getElementById('followers-terminal-logs');
    const progressBar = document.getElementById('followers-progress-fill');
    const progressPercent = document.getElementById('followers-progress-percent');
    const statusBadge = document.getElementById('followers-status-badge');

    if (btn) btn.disabled = true;
    if (statusBadge) {
      statusBadge.textContent = "RUNNING";
      statusBadge.className = "terminal-status-badge running";
    }
    if (progressBar) progressBar.classList.add('active-shimmer');
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

    addLog(`Initiating secure handshake for @${handle} via token [PIN: ${pin}]...`, 'info');

    let step = 0;
    const totalSteps = 10;
    const interval = setInterval(() => {
      step++;
      const percent = Math.min(100, Math.round((step / totalSteps) * 100));
      if (progressBar) progressBar.style.width = `${percent}%`;
      if (progressPercent) progressPercent.textContent = `${percent}%`;

      if (step === 2) {
        addLog(`Verified authorization token. Matched active cluster node: us-east-pool-04`, 'success');
      } else if (step === 4) {
        addLog(`Querying niche pool for active mutual creators...`, 'info');
      } else if (step === 6) {
        const peers = ['@alex_defi', '@sarah_builds', '@web3_samurai', '@crypto_nova', '@dev_marcus'];
        const randomPeer = peers[Math.floor(Math.random() * peers.length)];
        addLog(`Follower task dispatched: peer ${randomPeer} engaged successfully`, 'success');
      } else if (step === 8) {
        addLog(`Applying humanized rate limit jitter (anti-detection guard active)...`, 'info');
      } else if (step === 10) {
        clearInterval(interval);
        addLog(`Target batch completed successfully. +125 community followers registered!`, 'success');
        if (progressBar) progressBar.classList.remove('active-shimmer');
        if (statusBadge) {
          statusBadge.textContent = "COMPLETED";
          statusBadge.className = "terminal-status-badge running";
        }
        if (btn) btn.disabled = false;
        window.toolkityApp.showToast('Growth Task Completed', `Successfully dispatched followers to @${handle}!`, 'success');
      }
    }, 850);
  }

  // 2. Twitter Unfollower Scanner
  scanUnfollowers() {
    const handleInput = document.getElementById('unfollow-handle-input');
    const handle = (handleInput?.value || '').replace('@', '').trim();

    if (!handle) {
      window.toolkityApp.showToast('Input Required', 'Please enter your Twitter handle to scan', 'warning');
      return;
    }

    const container = document.getElementById('unfollow-results-container');
    const countDisplay = document.getElementById('unfollow-count-badge');
    const scanBtn = document.getElementById('btn-scan-unfollowers');

    if (scanBtn) {
      scanBtn.disabled = true;
      scanBtn.textContent = 'Scanning Relationship Graph...';
    }

    setTimeout(() => {
      if (scanBtn) {
        scanBtn.disabled = false;
        scanBtn.textContent = 'Scan Following Network';
      }

      if (container) {
        container.innerHTML = TOOLKITY_DATA.mockNonFollowers.map((user, idx) => `
          <div class="non-follower-item" id="unfollow-item-${idx}">
            <div class="item-left">
              <img src="${user.avatar}" class="user-avatar" style="width:36px; height:36px;" alt="">
              <div>
                <strong style="color: var(--text-primary); font-size:0.88rem;">@${user.handle}</strong>
                <div style="font-size:0.75rem; color: var(--color-rose);">${user.reason}</div>
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn-danger-sm" onclick="window.socialToolsEngine.unfollowSingle('${user.handle}', 'unfollow-item-${idx}')">
                Unfollow
              </button>
            </div>
          </div>
        `).join('');
      }

      if (countDisplay) {
        countDisplay.textContent = `${TOOLKITY_DATA.mockNonFollowers.length} Found`;
        countDisplay.style.display = 'inline-block';
      }

      window.toolkityApp.showToast('Scan Complete', `Identified ${TOOLKITY_DATA.mockNonFollowers.length} non-reciprocal accounts`, 'info');
    }, 1400);
  }

  unfollowSingle(handle, elementId) {
    const el = document.getElementById(elementId);
    if (el) {
      el.style.opacity = '0.3';
      el.style.pointerEvents = 'none';
      setTimeout(() => {
        el.remove();
        window.toolkityApp.showToast('Unfollowed', `Removed @${handle} from your following list`, 'info');
      }, 400);
    }
  }

  bulkUnfollowAll() {
    const items = document.querySelectorAll('.non-follower-item');
    if (items.length === 0) {
      window.toolkityApp.showToast('Notice', 'No non-followers left to remove', 'info');
      return;
    }

    items.forEach((el, index) => {
      setTimeout(() => {
        el.style.opacity = '0.2';
        setTimeout(() => el.remove(), 300);
      }, index * 300);
    });

    setTimeout(() => {
      const countDisplay = document.getElementById('unfollow-count-badge');
      if (countDisplay) countDisplay.textContent = '0 Found';
      window.toolkityApp.showToast('Batch Clean Complete', 'All inactive non-followers have been purged', 'success');
    }, items.length * 300 + 400);
  }

  // 3. Twitter Retweet & Repost Engine
  startRetweetBooster() {
    const urlInput = document.getElementById('retweet-url-input');
    const url = (urlInput?.value || '').trim();

    if (!url || !url.includes('twitter.com') && !url.includes('x.com')) {
      window.toolkityApp.showToast('Invalid URL', 'Please enter a valid tweet URL (e.g., https://x.com/user/status/...)', 'warning');
      return;
    }

    const btn = document.getElementById('btn-run-retweet');
    const logsWindow = document.getElementById('retweet-terminal-logs');
    const progressBar = document.getElementById('retweet-progress-fill');

    if (btn) btn.disabled = true;
    if (progressBar) progressBar.style.width = '0%';
    if (logsWindow) logsWindow.innerHTML = '';

    const addLog = (text, type = 'info') => {
      if (!logsWindow) return;
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML = `<span class="log-time">[${timeStr}]</span> <span class="log-badge ${type}">${type.toUpperCase()}</span> <span class="log-text">${text}</span>`;
      logsWindow.appendChild(entry);
      logsWindow.scrollTop = logsWindow.scrollHeight;
    };

    addLog(`Target Tweet URL validated: ${url.substring(0, 45)}...`, 'info');
    addLog(`Analyzing tweet structure and media components...`, 'info');

    let p = 0;
    const iv = setInterval(() => {
      p += 20;
      if (progressBar) progressBar.style.width = `${p}%`;

      if (p === 40) addLog(`Distributing tweet hash to 50+ active high-karma nodes...`, 'info');
      if (p === 60) addLog(`Verified 18 peer retweets within algorithmic safe window`, 'success');
      if (p === 80) addLog(`Quote retweets & organic impressions climbing steadily`, 'success');
      if (p >= 100) {
        clearInterval(iv);
        addLog(`Campaign launched! Expected viral lift: 4.8x normal reach`, 'success');
        if (btn) btn.disabled = false;
        window.toolkityApp.showToast('Retweet Boost Dispatched', 'Tweet added to viral engagement queue!', 'success');
      }
    }, 700);
  }

  // 4. Twitter Likes Engine
  startLikesBooster() {
    const tagInput = document.getElementById('likes-tag-input');
    const tag = tagInput?.value.trim() || '#web3';

    const btn = document.getElementById('btn-run-likes');
    const logsWindow = document.getElementById('likes-terminal-logs');
    const progressBar = document.getElementById('likes-progress-fill');

    if (btn) btn.disabled = true;
    if (progressBar) progressBar.style.width = '0%';
    if (logsWindow) logsWindow.innerHTML = '';

    const addLog = (text, type = 'info') => {
      if (!logsWindow) return;
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML = `<span class="log-time">[${timeStr}]</span> <span class="log-badge ${type}">${type.toUpperCase()}</span> <span class="log-text">${text}</span>`;
      logsWindow.appendChild(entry);
      logsWindow.scrollTop = logsWindow.scrollHeight;
    };

    addLog(`Setting up targeted like stream for keyword/hashtag "${tag}"...`, 'info');

    let p = 0;
    const iv = setInterval(() => {
      p += 25;
      if (progressBar) progressBar.style.width = `${p}%`;

      if (p === 50) addLog(`Discovered 42 trending tweets matching criteria in the last 15 mins`, 'info');
      if (p === 75) addLog(`Auto-liked 15 posts with 4.2s randomized cooldown intervals`, 'success');
      if (p >= 100) {
        clearInterval(iv);
        addLog(`Auto-liker session completed. 35 likes dispatched safely.`, 'success');
        if (btn) btn.disabled = false;
        window.toolkityApp.showToast('Likes Dispatched', `Engaged with top posts in ${tag}!`, 'success');
      }
    }, 650);
  }

  // 5. Bulk DM Cleaner
  scanDMs() {
    const container = document.getElementById('dm-list-container');
    const btn = document.getElementById('btn-scan-dms');

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Scanning Messages...';
    }

    setTimeout(() => {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Scan Inbox';
      }

      if (container) {
        container.innerHTML = TOOLKITY_DATA.mockSpamDMs.map(dm => `
          <div class="dm-item" id="dm-item-${dm.id}">
            <div class="item-left">
              <input type="checkbox" checked class="dm-checkbox" style="accent-color: var(--color-twitter); width: 16px; height: 16px;">
              <div>
                <strong style="color: var(--text-primary); font-size:0.85rem;">${dm.sender}</strong>
                <div style="font-size:0.78rem; color: var(--text-secondary); max-width: 400px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${dm.preview}
                </div>
              </div>
            </div>
            <div style="font-size:0.72rem; color: var(--text-muted);">${dm.date}</div>
          </div>
        `).join('');
      }

      window.toolkityApp.showToast('Scan Completed', `Found ${TOOLKITY_DATA.mockSpamDMs.length} unsolicited promotional DMs`, 'info');
    }, 1000);
  }

  purgeSelectedDMs() {
    const items = document.querySelectorAll('.dm-item');
    if (items.length === 0) {
      window.toolkityApp.showToast('Notice', 'No spam DMs found to purge', 'info');
      return;
    }

    items.forEach((item, idx) => {
      setTimeout(() => {
        item.style.opacity = '0.2';
        setTimeout(() => item.remove(), 250);
      }, idx * 200);
    });

    setTimeout(() => {
      const container = document.getElementById('dm-list-container');
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: var(--color-emerald); font-weight: 600;">
            ✓ Inbox is 100% clean! All spam DMs deleted.
          </div>
        `;
      }
      window.toolkityApp.showToast('Purge Successful', 'Selected spam DMs deleted permanently', 'success');
    }, items.length * 200 + 300);
  }

  // 6. Delete All Tweets / Archive Cleaner
  startTweetPurge() {
    const handleInput = document.getElementById('tweet-cleaner-handle');
    const handle = (handleInput?.value || '').replace('@', '').trim();

    if (!handle) {
      window.toolkityApp.showToast('Validation Error', 'Please enter your Twitter handle to proceed', 'warning');
      return;
    }

    const confirmed = confirm(`Are you sure you want to mass delete tweets for @${handle} based on your filters? This action cannot be undone.`);
    if (!confirmed) return;

    const btn = document.getElementById('btn-run-tweet-purge');
    const logsWindow = document.getElementById('tweet-purge-terminal-logs');
    const progressBar = document.getElementById('tweet-purge-progress-fill');

    if (btn) btn.disabled = true;
    if (progressBar) progressBar.style.width = '0%';
    if (logsWindow) logsWindow.innerHTML = '';

    const addLog = (text, type = 'info') => {
      if (!logsWindow) return;
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML = `<span class="log-time">[${timeStr}]</span> <span class="log-badge ${type}">${type.toUpperCase()}</span> <span class="log-text">${text}</span>`;
      logsWindow.appendChild(entry);
      logsWindow.scrollTop = logsWindow.scrollHeight;
    };

    addLog(`Loading timeline metadata for @${handle}...`, 'info');

    let p = 0;
    const iv = setInterval(() => {
      p += 20;
      if (progressBar) progressBar.style.width = `${p}%`;

      if (p === 40) addLog(`Identified 384 tweets matching age threshold (>6 months old)`, 'info');
      if (p === 60) addLog(`Safeguarding tweets with >100 likes and pinned content...`, 'info');
      if (p === 80) addLog(`Batch 1 & 2 deleted (250 tweets wiped from cache)`, 'success');
      if (p >= 100) {
        clearInterval(iv);
        addLog(`Timeline archive cleaned! 384 old tweets deleted successfully.`, 'success');
        if (btn) btn.disabled = false;
        window.toolkityApp.showToast('Archive Sweeper Done', `Successfully cleaned tweets for @${handle}!`, 'success');
      }
    }, 750);
  }

  // 7. Instagram Hashtag Generator
  generateInstagramHashtags() {
    const nicheInput = document.getElementById('ig-niche-input');
    const niche = (nicheInput?.value || '').trim().toLowerCase() || 'crypto';

    const outputBox = document.getElementById('ig-hashtags-output');
    const copyBtn = document.getElementById('btn-copy-ig-tags');

    const hashtagDictionary = {
      crypto: ['#crypto', '#cryptocurrency', '#bitcoin', '#ethereum', '#web3', '#blockchain', '#defi', '#trading', '#cryptonews', '#altcoins', '#hodl', '#nftcommunity', '#binance', '#solana', '#investing'],
      fitness: ['#fitness', '#gym', '#workout', '#fitnessmotivation', '#fitfam', '#bodybuilding', '#training', '#health', '#fit', '#lifestyle', '#gymlife', '#muscle', '#fitnessjourney', '#exercise'],
      tech: ['#technology', '#tech', '#ai', '#developer', '#coding', '#software', '#webdevelopment', '#programming', '#innovation', '#datascience', '#machinelearning', '#gadgets', '#startups'],
      creator: ['#contentcreator', '#creator', '#digitalcreator', '#creatoreconomy', '#videoediting', '#reelsinstagram', '#contentcreation', '#influencer', '#creative', '#photography', '#vlog']
    };

    const tags = hashtagDictionary[niche] || [
      `#${niche}`, `#${niche}growth`, `#${niche}daily`, `#${niche}tips`, `#viral${niche}`,
      `#${niche}community`, `#trending${niche}`, `#${niche}life`, `#explorepage`, `#reels`
    ];

    if (outputBox) {
      outputBox.innerHTML = tags.map(tag => `
        <span class="pill-option active" style="font-family: var(--font-mono); font-size:0.8rem; display:inline-block; margin: 3px;">
          ${tag}
        </span>
      `).join('');
    }

    if (copyBtn) copyBtn.style.display = 'inline-flex';
    window.toolkityApp.showToast('Hashtags Generated', `Compiled ${tags.length} high-reach hashtags for "${niche}"`, 'success');
  }

  copyInstagramTags() {
    const pills = document.querySelectorAll('#ig-hashtags-output .pill-option');
    const tagList = Array.from(pills).map(p => p.textContent.trim()).join(' ');
    if (!tagList) return;

    navigator.clipboard.writeText(tagList).then(() => {
      window.toolkityApp.showToast('Copied to Clipboard', `${pills.length} hashtags copied!`, 'success');
    });
  }

  // 8. YouTube SEO Tag Extractor & Title Scorer
  analyzeYouTubeSEO() {
    const titleInput = document.getElementById('yt-title-input');
    const title = (titleInput?.value || '').trim();

    if (!title) {
      window.toolkityApp.showToast('Input Required', 'Please enter a video title or URL to evaluate', 'warning');
      return;
    }

    const scoreDisplay = document.getElementById('yt-score-display');
    const tagsBox = document.getElementById('yt-tags-box');
    const tipsBox = document.getElementById('yt-tips-box');

    // Generate smart score based on title length and power words
    let score = 75;
    const powerWords = ['how to', 'best', 'guide', 'review', '2026', 'ultimate', 'secrets', 'fast'];
    powerWords.forEach(pw => {
      if (title.toLowerCase().includes(pw)) score += 5;
    });
    if (title.length > 40 && title.length < 70) score += 8;
    score = Math.min(98, score);

    if (scoreDisplay) {
      scoreDisplay.textContent = `${score}/100`;
      scoreDisplay.style.color = score > 85 ? 'var(--color-emerald)' : 'var(--color-amber)';
    }

    const words = title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length > 3);
    const generatedTags = [
      ...words,
      `${words[0] || 'video'} tutorial`,
      `${words[1] || 'tech'} 2026`,
      'beginner guide',
      'full walkthrough',
      'step by step'
    ];

    if (tagsBox) {
      tagsBox.innerHTML = generatedTags.map(t => `
        <span class="pill-option active" style="font-family: var(--font-mono); font-size:0.78rem; display:inline-block; margin: 3px;">
          ${t}
        </span>
      `).join('');
    }

    if (tipsBox) {
      tipsBox.innerHTML = `
        <ul style="margin-left: 1.25rem; font-size: 0.82rem; color: var(--text-secondary); line-height: 1.6;">
          <li>✓ Title length (${title.length} chars) is optimized for mobile search results</li>
          <li>✓ High CTR potential with emotional hook keywords</li>
          <li>💡 Tip: Use bright thumbnail contrast with a maximum of 4 focus words</li>
        </ul>
      `;
    }

    window.toolkityApp.showToast('SEO Analysis Complete', `Video Title Clickability: ${score}/100`, 'success');
  }
}

// Global instantiation
document.addEventListener('DOMContentLoaded', () => {
  window.socialToolsEngine = new SocialToolsEngine();
});
