// =========================================
// 活動ログ詳細画面
// =========================================
Views.detail = {
  state: {
    log: null,
    loading: false
  },
  
  async render(container, appState, recordId) {
    // recordIdが渡されたら新規読み込み
    if (recordId) {
      this.state.loading = true;
      this.state.log = null;
      this.renderLoading(container);
      try {
        const data = await API.get('getLogDetail', { recordId: recordId });
        this.state.log = data.log;
        this.state.loading = false;
      } catch (e) {
        this.state.loading = false;
        App.showError('詳細の取得に失敗しました: ' + e.message);
        App.navigate('list');
        return;
      }
    }
    
    if (!this.state.log) {
      container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--color-text-light);">読み込み中...</div>';
      return;
    }
    
    this.renderLog(container);
  },
  
  renderLoading(container) {
    container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--color-text-light);">読み込み中...</div>';
  },
  
  renderLog(container) {
    const log = this.state.log;
    
    container.innerHTML = `
      <div class="form-section">
        <div class="log-badges" style="margin-bottom: 12px;">
          <span class="badge badge-cat-${this.sanitizeCat(log.category)}">${escapeHtml(log.category)}</span>
          ${log.phase ? `<span class="badge badge-phase">${escapeHtml(log.phase)}</span>` : ''}
        </div>
        
        <h2 style="font-size: 17px; font-weight: 500; line-height: 1.5; margin: 0 0 14px 0;">
          ${escapeHtml(log.title)}
        </h2>
        
        <div class="form-info" style="margin-bottom: 14px;">
          <div class="form-info-label">投稿者</div>
          <div class="form-info-value">${escapeHtml(log.authorName)} ${log.authorAffiliation ? '(' + escapeHtml(log.authorAffiliation) + ')' : ''}</div>
          <div class="form-info-label" style="margin-top: 6px;">投稿日</div>
          <div class="form-info-value">${formatDate(log.postedDate)}</div>
          ${log.disasterName ? `
            <div class="form-info-label" style="margin-top: 6px;">関連案件</div>
            <div class="form-info-value">${escapeHtml(log.disasterName)}</div>
          ` : ''}
        </div>
        
        <div class="form-group">
          <label class="form-label">内容</label>
          <div style="background: var(--color-surface); padding: 12px 14px; border-radius: var(--radius-md); border: 0.5px solid var(--color-border-light); font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(log.content)}</div>
        </div>
        
        ${log.tags ? `
          <div class="form-group">
            <label class="form-label">タグ</label>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${log.tags.split(',').map(t => t.trim()).filter(t => t).map(t => 
                `<span style="background: var(--color-surface-alt); color: var(--color-text-muted); font-size: 11px; padding: 4px 10px; border-radius: 12px;">${escapeHtml(t)}</span>`
              ).join('')}
            </div>
          </div>
        ` : ''}
        
        ${log.remarks ? `
          <div class="form-group">
            <label class="form-label">備考</label>
            <div style="background: var(--color-surface); padding: 12px 14px; border-radius: var(--radius-md); border: 0.5px solid var(--color-border-light); font-size: 13px; line-height: 1.6; white-space: pre-wrap; color: var(--color-text-muted);">${escapeHtml(log.remarks)}</div>
          </div>
        ` : ''}
      </div>
    `;
  },
  
  sanitizeCat(cat) {
    return cat ? cat.replace(/[^a-zA-Z\u4e00-\u9faf]/g, '') : '';
  }
};
