// =========================================
// 活動ログ一覧画面
// =========================================
Views.list = {
  state: {
    filter: 'all',
    logs: [],
    loaded: false
  },
  
  async render(container, appState) {
    container.innerHTML = `
      <div class="filter-bar">
        <div class="filter-pills" id="filter-pills">
          ${['all', '日報', 'Tips', '失敗談', 'Q＆A', '資料共有'].map(c => `
            <div class="filter-pill ${this.state.filter === c ? 'active' : ''}" data-value="${c}">
              ${c === 'all' ? 'すべて' : c}
            </div>
          `).join('')}
        </div>
      </div>
      <div class="log-list" id="log-list">
        <div style="padding: 40px; text-align: center; color: var(--color-text-light);">
          読み込み中...
        </div>
      </div>
    `;
    
    container.querySelectorAll('#filter-pills .filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.state.filter = pill.dataset.value;
        this.render(container, appState);
      });
    });
    
    await this.loadLogs();
    this.renderList(container);
  },
  
  async loadLogs() {
    try {
      const data = await API.get('getLogs', { 
        category: this.state.filter,
        limit: 30
      });
      this.state.logs = data.logs || [];
      this.state.loaded = true;
    } catch (e) {
      App.showError('一覧の取得に失敗しました: ' + e.message);
    }
  },
  
  renderList(container) {
    const listEl = container.querySelector('#log-list');
    if (this.state.logs.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--color-text-light);">
          該当するログがありません
        </div>
      `;
      return;
    }
    
    listEl.innerHTML = this.state.logs.map(log => `
      <div class="log-card" data-id="${log.recordId}">
        <div class="log-badges">
          <span class="badge badge-cat-${this.sanitizeCat(log.category)}">${escapeHtml(log.category)}</span>
          ${log.phase ? `<span class="badge badge-phase">${escapeHtml(log.phase)}</span>` : ''}
        </div>
        <div class="log-title">${escapeHtml(log.title)}</div>
        <div class="log-excerpt">${escapeHtml(log.content)}</div>
        <div class="log-meta">
          <span>${escapeHtml(log.authorName)}</span>
          <span>·</span>
          <span>${formatDate(log.postedDate)}</span>
        </div>
      </div>
    `).join('');
    
    // カードのタップで詳細画面に遷移
    listEl.querySelectorAll('.log-card').forEach(card => {
      card.addEventListener('click', () => {
        const recordId = card.dataset.id;
        App.navigate('detail', recordId);
      });
    });
  },
  
  sanitizeCat(cat) {
    return cat ? cat.replace(/[^a-zA-Z\u4e00-\u9faf]/g, '') : '';
  }
};

function formatDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return `${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`;
}
