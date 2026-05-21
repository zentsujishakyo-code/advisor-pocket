// =========================================
// 活動ログ一覧画面 (検索・絞り込み対応)
// =========================================
Views.list = {
  state: {
    // 検索・絞り込み条件
    keyword: '',
    category: 'all',
    phase: 'all',
    disaster: 'all',
    author: 'all',
    sortOrder: 'desc', // desc=新しい順, asc=古い順
    showFilters: false, // 詳細絞り込みパネルの開閉
    
    // データ
    logs: [],
    loaded: false,
    cacheTime: 0,
    
    // 絞り込み選択肢 (初回読み込み時に取得)
    filterOptions: { advisors: [], disasters: [] },
    optionsLoaded: false,
  },
  
  CACHE_TTL: 5 * 60 * 1000,
  
  invalidateCache() {
    this.state.logs = [];
    this.state.loaded = false;
    this.state.cacheTime = 0;
  },
  
  async render(container, appState) {
    container.innerHTML = `
      <div class="search-bar" style="padding: 12px 16px; border-bottom: 0.5px solid var(--color-border-light); background: var(--color-surface);">
        <div style="display: flex; gap: 8px; align-items: center;">
          <input type="search" id="f-keyword" class="form-input" 
                 placeholder="🔍 キーワード検索 (タイトル・内容・タグ)"
                 value="${escapeHtml(this.state.keyword)}"
                 style="flex: 1; height: 40px;">
          <button id="f-search-btn" class="btn btn-primary" 
                  style="flex: 0 0 auto; width: 64px; height: 40px; font-size: 14px;">
            検索
          </button>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <button id="f-toggle-filters" 
                  style="background: none; border: none; color: var(--color-primary); font-size: 13px; cursor: pointer; padding: 4px 0; font-weight: 500;">
            ${this.state.showFilters ? '▼ 絞り込みを閉じる' : '▶ 絞り込み・並び替え'}
          </button>
          ${this.hasActiveFilter() ? `
            <button id="f-clear-filters" 
                    style="background: none; border: none; color: var(--color-text-muted); font-size: 12px; cursor: pointer; padding: 4px 8px;">
              条件をクリア
            </button>
          ` : ''}
        </div>
        
        <div id="filter-panel" style="display: ${this.state.showFilters ? 'block' : 'none'}; margin-top: 12px; padding-top: 12px; border-top: 0.5px dashed var(--color-border);">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-size: 12px; color: var(--color-text-muted); display: block; margin-bottom: 4px;">種別</label>
              <select id="f-category" class="form-select" style="height: 38px; font-size: 14px;">
                <option value="all" ${this.state.category === 'all' ? 'selected' : ''}>すべて</option>
                <option value="日報" ${this.state.category === '日報' ? 'selected' : ''}>日報</option>
                <option value="Tips" ${this.state.category === 'Tips' ? 'selected' : ''}>Tips</option>
                <option value="失敗談" ${this.state.category === '失敗談' ? 'selected' : ''}>失敗談</option>
                <option value="Q＆A" ${this.state.category === 'Q＆A' ? 'selected' : ''}>Q&amp;A</option>
                <option value="資料共有" ${this.state.category === '資料共有' ? 'selected' : ''}>資料共有</option>
              </select>
            </div>
            <div>
              <label style="font-size: 12px; color: var(--color-text-muted); display: block; margin-bottom: 4px;">フェーズ</label>
              <select id="f-phase" class="form-select" style="height: 38px; font-size: 14px;">
                <option value="all" ${this.state.phase === 'all' ? 'selected' : ''}>すべて</option>
                <option value="立ち上げ期" ${this.state.phase === '立ち上げ期' ? 'selected' : ''}>立ち上げ期</option>
                <option value="安定期" ${this.state.phase === '安定期' ? 'selected' : ''}>安定期</option>
                <option value="縮小期" ${this.state.phase === '縮小期' ? 'selected' : ''}>縮小期</option>
                <option value="閉所" ${this.state.phase === '閉所' ? 'selected' : ''}>閉所</option>
              </select>
            </div>
            <div>
              <label style="font-size: 12px; color: var(--color-text-muted); display: block; margin-bottom: 4px;">災害名</label>
              <select id="f-disaster" class="form-select" style="height: 38px; font-size: 14px;">
                <option value="all">すべて</option>
                ${(this.state.filterOptions.disasters || []).map(d => 
                  `<option value="${escapeHtml(d)}" ${this.state.disaster === d ? 'selected' : ''}>${escapeHtml(d)}</option>`
                ).join('')}
              </select>
            </div>
            <div>
              <label style="font-size: 12px; color: var(--color-text-muted); display: block; margin-bottom: 4px;">投稿者</label>
              <select id="f-author" class="form-select" style="height: 38px; font-size: 14px;">
                <option value="all">すべて</option>
                ${(this.state.filterOptions.advisors || []).map(a => 
                  `<option value="${escapeHtml(a)}" ${this.state.author === a ? 'selected' : ''}>${escapeHtml(a)}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div style="margin-top: 10px;">
            <label style="font-size: 12px; color: var(--color-text-muted); display: block; margin-bottom: 4px;">並び替え</label>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="sort-btn ${this.state.sortOrder === 'desc' ? 'active' : ''}" data-order="desc"
                      style="flex: 1; padding: 8px; border: 0.5px solid var(--color-border); border-radius: var(--radius-md); background: ${this.state.sortOrder === 'desc' ? 'var(--color-primary)' : 'var(--color-surface)'}; color: ${this.state.sortOrder === 'desc' ? 'white' : 'var(--color-text-muted)'}; font-size: 13px; cursor: pointer;">
                新しい順
              </button>
              <button type="button" class="sort-btn ${this.state.sortOrder === 'asc' ? 'active' : ''}" data-order="asc"
                      style="flex: 1; padding: 8px; border: 0.5px solid var(--color-border); border-radius: var(--radius-md); background: ${this.state.sortOrder === 'asc' ? 'var(--color-primary)' : 'var(--color-surface)'}; color: ${this.state.sortOrder === 'asc' ? 'white' : 'var(--color-text-muted)'}; font-size: 13px; cursor: pointer;">
                古い順
              </button>
            </div>
          </div>
          <button id="f-apply-filters" class="btn btn-primary" style="width: 100%; margin-top: 12px; height: 42px;">
            この条件で検索
          </button>
        </div>
      </div>
      
      <div class="log-list" id="log-list">
        ${this.state.loaded ? '' : '<div style="padding: 40px; text-align: center; color: var(--color-text-light);">読み込み中...</div>'}
      </div>
    `;
    
    // 絞り込み選択肢を初回読み込み
    if (!this.state.optionsLoaded) {
      this.loadFilterOptions().then(() => {
        if (App.state.currentView === 'list' && this.state.showFilters) {
          this.render(container, appState);
        }
      });
    }
    
    // イベントハンドラ
    this.bindEvents(container, appState);
    
    // データ取得
    const cacheAge = Date.now() - this.state.cacheTime;
    if (this.state.loaded && cacheAge < this.CACHE_TTL) {
      this.renderList(container);
      this.loadLogs(true).then(() => {
        if (App.state.currentView === 'list') {
          this.renderList(container);
        }
      });
      return;
    }
    
    await this.loadLogs();
    this.renderList(container);
  },
  
  bindEvents(container, appState) {
    const self = this;
    
    // 検索ボタン
    const searchBtn = document.getElementById('f-search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        self.state.keyword = (document.getElementById('f-keyword').value || '').trim();
        self.invalidateCache();
        self.render(container, appState);
      });
    }
    
    // キーワード欄でEnter
    const keywordEl = document.getElementById('f-keyword');
    if (keywordEl) {
      keywordEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          self.state.keyword = (keywordEl.value || '').trim();
          self.invalidateCache();
          self.render(container, appState);
        }
      });
    }
    
    // 絞り込みパネルの開閉
    const toggleBtn = document.getElementById('f-toggle-filters');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        self.state.showFilters = !self.state.showFilters;
        self.render(container, appState);
      });
    }
    
    // 条件クリア
    const clearBtn = document.getElementById('f-clear-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        self.state.keyword = '';
        self.state.category = 'all';
        self.state.phase = 'all';
        self.state.disaster = 'all';
        self.state.author = 'all';
        self.state.sortOrder = 'desc';
        self.invalidateCache();
        self.render(container, appState);
      });
    }
    
    // ソートボタン
    container.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        self.state.sortOrder = btn.dataset.order;
        // 表示だけ即時反映 (適用は「この条件で検索」)
        container.querySelectorAll('.sort-btn').forEach(b => {
          const active = b.dataset.order === self.state.sortOrder;
          b.style.background = active ? 'var(--color-primary)' : 'var(--color-surface)';
          b.style.color = active ? 'white' : 'var(--color-text-muted)';
        });
      });
    });
    
    // 「この条件で検索」ボタン
    const applyBtn = document.getElementById('f-apply-filters');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        self.state.category = document.getElementById('f-category').value;
        self.state.phase = document.getElementById('f-phase').value;
        self.state.disaster = document.getElementById('f-disaster').value;
        self.state.author = document.getElementById('f-author').value;
        self.state.keyword = (document.getElementById('f-keyword').value || '').trim();
        self.invalidateCache();
        self.render(container, appState);
      });
    }
  },
  
  hasActiveFilter() {
    const s = this.state;
    return s.keyword || s.category !== 'all' || s.phase !== 'all' 
        || s.disaster !== 'all' || s.author !== 'all' || s.sortOrder !== 'desc';
  },
  
  async loadFilterOptions() {
    try {
      const data = await API.get('getFilterOptions');
      this.state.filterOptions = {
        advisors: data.advisors || [],
        disasters: data.disasters || []
      };
      this.state.optionsLoaded = true;
    } catch (e) {
      // 失敗時は空のまま
    }
  },
  
  async loadLogs(silent) {
    try {
      const params = {
        keyword: this.state.keyword,
        category: this.state.category,
        phase: this.state.phase,
        disaster: this.state.disaster,
        author: this.state.author,
        sortOrder: this.state.sortOrder,
        limit: 50
      };
      const data = await API.get('getLogs', params);
      this.state.logs = data.logs || [];
      this.state.loaded = true;
      this.state.cacheTime = Date.now();
    } catch (e) {
      if (!silent) {
        App.showError('一覧の取得に失敗しました: ' + e.message);
      }
    }
  },
  
  renderList(container) {
    const listEl = container.querySelector('#log-list');
    if (!listEl) return;
    
    if (this.state.logs.length === 0) {
      const message = this.hasActiveFilter() 
        ? '条件に該当するログがありません'
        : 'まだ投稿がありません';
      listEl.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--color-text-light);">
          ${message}
        </div>
      `;
      return;
    }
    
    // 件数バッジを上部に
    let html = `<div style="padding: 8px 16px; font-size: 12px; color: var(--color-text-muted); background: var(--color-bg);">
      ${this.state.logs.length}件 ${this.hasActiveFilter() ? '(検索結果)' : ''}
    </div>`;
    
    html += this.state.logs.map(log => `
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
          <span>${formatDateTime(log.postedDate)}</span>
          ${log.disasterName ? `<span>·</span><span style="color: var(--color-accent);">${escapeHtml(log.disasterName)}</span>` : ''}
        </div>
      </div>
    `).join('');
    
    listEl.innerHTML = html;
    
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
