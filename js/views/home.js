// =========================================
// ホーム画面
// =========================================
Views.home = {
  render(container, state) {
    const { advisor, currentDispatch } = state;
    
    container.innerHTML = `
      <div class="home-profile">
        <div class="home-profile-name">${escapeHtml(advisor.name)}</div>
        <div class="home-profile-affiliation">${escapeHtml(advisor.affiliation)}</div>
      </div>
      
      ${currentDispatch ? `
        <div class="current-dispatch">
          <div class="current-dispatch-label">現在の派遣案件</div>
          <div class="current-dispatch-name">${escapeHtml(currentDispatch.disasterName)}</div>
          <div class="current-dispatch-sub">${escapeHtml(currentDispatch.dispatchTo)}・派遣中</div>
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
