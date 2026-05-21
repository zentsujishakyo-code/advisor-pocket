// =========================================
// ホーム画面
// =========================================
Views.home = {
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
    
    // アバターのHTML: 写真があれば写真、なければイニシャル
    const avatarHtml = advisor.photo
      ? `<img src="${advisor.photo}" alt="${escapeHtml(advisor.name)}">`
      : escapeHtml((advisor.name || '').charAt(0));
    
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

/**
 * 日時を「2026/05/21 14:30」形式で表示
 */
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

/**
 * 日付のみ「2026/05/21」形式 (互換性のため残す)
 */
function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}
