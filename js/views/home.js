// =========================================
// ホーム画面 (未読バッジ表示対応)
// =========================================
Views.home = {
  state: {
    unreadCount: 0,
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
        <div class="menu-card" onclick="App.navigate('post')">
          <div class="menu-card-icon">✎</div>
          <div class="menu-card-title">活動ログを書く</div>
          <div class="menu-card-sub">日報・Tips・失敗談</div>
        </div>
        <div class="menu-card" onclick="App.navigate('list')">
          <div class="menu-card-icon">≡</div>
          <div class="menu-card-title">活動ログを見る</div>
          <div class="menu-card-sub">過去事例・検索</div>
        </div>
        <div class="menu-card" onclick="App.navigate('profile')">
          <div class="menu-card-icon">◉</div>
          <div class="menu-card-title">プロフィール</div>
          <div class="menu-card-sub">連絡先・派遣可否</div>
        </div>
      </div>
    `;
  },
  
  render(container, state) {
    const { advisor, currentDispatch } = state;
    
    const avatarHtml = advisor.photo
      ? `<img src="${advisor.photo}" alt="${escapeHtml(advisor.name)}">`
      : escapeHtml((advisor.name || '').charAt(0));
    
    const unreadBadge = this.state.unreadCount > 0 
      ? `<span class="unread-badge">${this.state.unreadCount > 99 ? '99+' : this.state.unreadCount}</span>` 
      : '';
    
    container.innerHTML = `
      <div class="home-profile">
        <div class="home-profile-avatar">${avatarHtml}</div>
        <div class="home-profile-text">
          <div class="home-profile-name">${escapeHtml(advisor.name)}</div>
          <div class="home-profile-affiliation">${escapeHtml(advisor.affiliation)}</div>
        </div>
      </div>
      
      ${currentDispatch ? `
        <div class="current-dispatch">
          <div class="current-dispatch-badge">派遣中</div>
          <div class="current-dispatch-label">現在の派遣案件</div>
          <div class="current-dispatch-name">${escapeHtml(currentDispatch.disasterName)}</div>
          <div class="current-dispatch-sub">${escapeHtml(currentDispatch.dispatchTo)}</div>
        </div>
      ` : ''}
      
      <div class="menu-grid">
        <div class="menu-card" onclick="App.navigate('post')">
          <div class="menu-card-icon">✎</div>
          <div class="menu-card-title">活動ログを書く</div>
          <div class="menu-card-sub">日報・Tips・失敗談</div>
        </div>
        <div class="menu-card" onclick="App.navigate('list')">
          ${unreadBadge}
          <div class="menu-card-icon">≡</div>
          <div class="menu-card-title">活動ログを見る</div>
          <div class="menu-card-sub">過去事例・検索</div>
        </div>
        <div class="menu-card" onclick="App.navigate('profile')">
          <div class="menu-card-icon">◉</div>
          <div class="menu-card-title">プロフィール</div>
          <div class="menu-card-sub">連絡先・派遣可否</div>
        </div>
      </div>
    `;
  },
  
  /**
   * 未読数を更新して再描画
   */
  setUnreadCount(count) {
    this.state.unreadCount = count;
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
  
  /**
   * 既読状態を全件取得
   * 戻り値: { logRecordId: { lastSeenCommentCount, lastSeenAt } }
   */
  getReadState() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  },
  
  /**
   * 既読状態を保存
   */
  saveReadState(state) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // 容量超過などは無視
    }
  },
  
  /**
   * 特定ログを既読化 (詳細画面表示時に呼ぶ)
   */
  markAsRead(logRecordId, currentCommentCount) {
    const state = this.getReadState();
    state[logRecordId] = {
      lastSeenCommentCount: currentCommentCount,
      lastSeenAt: new Date().toISOString()
    };
    this.saveReadState(state);
  },
  
  /**
   * 自分のログ一覧 (commentCount付き) から未読数を計算
   * items: [{ logRecordId, commentCount, latestCommentAt }, ...]
   */
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
  
  /**
   * 特定ログが未読か判定
   */
  isUnread(logRecordId, currentCommentCount) {
    const state = this.getReadState();
    const seen = state[logRecordId];
    const seenCount = seen ? seen.lastSeenCommentCount : 0;
    return currentCommentCount > seenCount;
  },
  
  /**
   * 特定ログの未読数を返す
   */
  getUnreadCount(logRecordId, currentCommentCount) {
    const state = this.getReadState();
    const seen = state[logRecordId];
    const seenCount = seen ? seen.lastSeenCommentCount : 0;
    return Math.max(0, currentCommentCount - seenCount);
  }
};
