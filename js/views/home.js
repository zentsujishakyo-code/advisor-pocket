// =========================================
// ホーム画面 (複数派遣対応)
// =========================================
Views.home = {
  state: {
    unreadCount: 0,
    recentLogs: [],
  },
  
  renderSkeleton(container) {
    container.innerHTML = `
      <div class="home-profile">
        <div class="home-profile-avatar" style="background: var(--color-surface-alt); color: transparent;">&nbsp;</div>
        <div class="home-profile-text">
          <div class="home-profile-name" style="background: var(--color-surface-alt); color: transparent; border-radius: 4px; width: 140px;">&nbsp;</div>
          <div class="home-profile-affiliation" style="background: var(--color-surface-alt); color: transparent; border-radius: 4px; width: 200px; margin-top: 4px;">&nbsp;</div>
        </div>
      </div>
      
      <div class="menu-grid">
        <div class="menu-card-primary is-write" onclick="App.navigate('post')">
          <div class="menu-card-primary-icon">✎</div>
          <div class="menu-card-primary-title">活動ログを書く</div>
          <div class="menu-card-primary-sub">日報・Tips・失敗談</div>
        </div>
        <div class="menu-card-primary is-view" onclick="App.navigate('list')">
          <div class="menu-card-primary-icon">≡</div>
          <div class="menu-card-primary-title">活動ログを見る</div>
          <div class="menu-card-primary-sub">過去事例・検索</div>
        </div>
      </div>
      <div class="menu-grid-secondary">
        <div class="menu-card-secondary" onclick="App.navigate('profile')">
          <span class="menu-card-secondary-icon">◉</span>
          <span class="menu-card-secondary-title">プロフィール</span>
        </div>
        <div class="menu-card-secondary" onclick="App.navigate('howto')">
          <span class="menu-card-secondary-icon">?</span>
          <span class="menu-card-secondary-title">使い方</span>
        </div>
      </div>
    `;
  },
  
  render(container, state) {
    const { advisor, currentDispatches } = state;
    
    const avatarHtml = advisor.photo
      ? `<img src="${advisor.photo}" alt="${escapeHtml(advisor.name)}">`
      : escapeHtml((advisor.name || '').charAt(0));
    
    const unreadBadge = this.state.unreadCount > 0 
      ? `<span class="unread-badge">${this.state.unreadCount > 99 ? '99+' : this.state.unreadCount}</span>` 
      : '';
    
    const dispatchesHtml = this.renderDispatches(currentDispatches);
    const recentLogsHtml = this.renderRecentLogs();
    
    container.innerHTML = `
      <div class="home-profile">
        <div class="home-profile-avatar">${avatarHtml}</div>
        <div class="home-profile-text">
          <div class="home-profile-name">${escapeHtml(advisor.name)}</div>
          <div class="home-profile-affiliation">${escapeHtml(advisor.affiliation)}</div>
        </div>
      </div>
      
      ${dispatchesHtml}
      
      <div class="menu-grid">
        <div class="menu-card-primary is-write" onclick="App.navigate('post')">
          <div class="menu-card-primary-icon">✎</div>
          <div class="menu-card-primary-title">活動ログを書く</div>
          <div class="menu-card-primary-sub">日報・Tips・失敗談</div>
        </div>
        <div class="menu-card-primary is-view" onclick="App.navigate('list')">
          ${unreadBadge}
          <div class="menu-card-primary-icon">≡</div>
          <div class="menu-card-primary-title">活動ログを見る</div>
          <div class="menu-card-primary-sub">過去事例・検索</div>
        </div>
      </div>
      <div class="menu-grid-secondary">
        <div class="menu-card-secondary" onclick="App.navigate('profile')">
          <span class="menu-card-secondary-icon">◉</span>
          <span class="menu-card-secondary-title">プロフィール</span>
        </div>
        <div class="menu-card-secondary" onclick="App.navigate('howto')">
          <span class="menu-card-secondary-icon">?</span>
          <span class="menu-card-secondary-title">使い方</span>
        </div>
      </div>

      ${recentLogsHtml}
    `;
  },
  
  /**
   * 派遣中の案件を表示 (複数対応)
   */
  renderDispatches(dispatches) {
    if (!dispatches || dispatches.length === 0) return '';
    
    if (dispatches.length === 1) {
      const d = dispatches[0];
      return `
        <div class="current-dispatch">
          <div class="current-dispatch-badge">派遣中</div>
          <div class="current-dispatch-label">現在の派遣案件</div>
          <div class="current-dispatch-name">${escapeHtml(d.disasterName)}</div>
          <div class="current-dispatch-sub">${escapeHtml(d.dispatchTo)}</div>
        </div>
      `;
    }
    
    // 複数派遣中の場合
    const items = dispatches.map(d => `
      <div class="current-dispatch-item">
        <div class="current-dispatch-item-name">${escapeHtml(d.disasterName)}</div>
        <div class="current-dispatch-item-sub">${escapeHtml(d.dispatchTo)}</div>
      </div>
    `).join('');
    
    return `
      <div class="current-dispatch current-dispatch-multi">
        <div class="current-dispatch-badge">派遣中 ${dispatches.length}件</div>
        <div class="current-dispatch-label">現在の派遣案件</div>
        <div class="current-dispatch-items">
          ${items}
        </div>
      </div>
    `;
  },
  
  /**
   * 最新投稿エリアを描画
   */
  renderRecentLogs() {
    const logs = this.state.recentLogs;
    
    if (!logs || logs.length === 0) {
      return '';
    }
    
    const itemsHtml = logs.map(log => {
      const catColor = this.getCatColor(log.category);
      return `
        <div class="recent-log-item" onclick="App.navigate('detail', '${log.recordId}')">
          <div class="recent-log-cat" style="background: ${catColor};">${escapeHtml(log.category)}</div>
          <div class="recent-log-body">
            <div class="recent-log-title">${escapeHtml(log.title)}</div>
            <div class="recent-log-meta">
              <span>${escapeHtml(log.authorName)}</span>
              <span>·</span>
              <span>${this.formatRelativeTime(log.postedDate)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <div class="recent-logs-section">
        <div class="recent-logs-header">
          <span>最近の投稿</span>
          <button onclick="App.navigate('list')" class="recent-logs-link">すべて見る →</button>
        </div>
        <div class="recent-logs-list">
          ${itemsHtml}
        </div>
      </div>
    `;
  },
  
  getCatColor(category) {
    const map = {
      '日報': '#5B8FB9',
      'Tips': '#5B9D5E',
      '失敗談': '#D4881C',
      'Q＆A': '#9B6BAF',
      '資料共有': '#7A7A75',
    };
    return map[category] || '#7A7A75';
  },
  
  formatRelativeTime(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    
    if (diffMin < 1) return 'たった今';
    if (diffMin < 60) return `${diffMin}分前`;
    if (diffHr < 24) return `${diffHr}時間前`;
    if (diffDay === 1) return '昨日';
    if (diffDay < 7) return `${diffDay}日前`;
    return `${d.getMonth()+1}/${d.getDate()}`;
  },
  
  setUnreadCount(count) {
    this.state.unreadCount = count;
  },
  
  setRecentLogs(logs) {
    this.state.recentLogs = logs;
  }
};

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} ${h}:${min}`;
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}


// =========================================
// 未読管理ヘルパー (LocalStorage)
// =========================================
const UnreadManager = {
  STORAGE_KEY: 'advisor_pocket_read_state',
  
  getReadState() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  },
  
  saveReadState(state) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
    }
  },
  
  markAsRead(logRecordId, currentCommentCount) {
    const state = this.getReadState();
    state[logRecordId] = {
      lastSeenCommentCount: currentCommentCount,
      lastSeenAt: new Date().toISOString()
    };
    this.saveReadState(state);
  },
  
  countUnread(items) {
    const state = this.getReadState();
    let total = 0;
    items.forEach(item => {
      const seen = state[item.logRecordId];
      const seenCount = seen ? seen.lastSeenCommentCount : 0;
      if (item.commentCount > seenCount) {
        total += (item.commentCount - seenCount);
      }
    });
    return total;
  },
  
  isUnread(logRecordId, currentCommentCount) {
    const state = this.getReadState();
    const seen = state[logRecordId];
    const seenCount = seen ? seen.lastSeenCommentCount : 0;
    return currentCommentCount > seenCount;
  },
  
  getUnreadCount(logRecordId, currentCommentCount) {
    const state = this.getReadState();
    const seen = state[logRecordId];
    const seenCount = seen ? seen.lastSeenCommentCount : 0;
    return Math.max(0, currentCommentCount - seenCount);
  }
};
