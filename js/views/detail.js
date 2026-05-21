// =========================================
// 活動ログ詳細画面 (添付ファイル拡張対応)
// =========================================
Views.detail = {
  state: {
    log: null,
    loading: false,
    imageCache: {},
    appState: null
  },
  
  isImage(mimeType) {
    return mimeType && mimeType.startsWith('image/');
  },
  
  getFileIcon(mimeType) {
    if (!mimeType) return '📎';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.indexOf('word') !== -1) return '📝';
    if (mimeType.indexOf('sheet') !== -1 || mimeType.indexOf('excel') !== -1) return '📊';
    if (mimeType.indexOf('presentation') !== -1 || mimeType.indexOf('powerpoint') !== -1) return '📽️';
    return '📎';
  },
  
  async render(container, appState, recordId) {
    this.state.appState = appState;
    
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
    this.loadAttachments();
  },
  
  renderLoading(container) {
    container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--color-text-light);">読み込み中...</div>';
  },
  
  renderLog(container) {
    const log = this.state.log;
    const advisor = this.state.appState.advisor;
    const hasAttachments = log.attachments && log.attachments.length > 0;
    const isOwner = advisor && log.authorName === advisor.name;
    
    container.innerHTML = `
      <div class="form-section">
        ${isOwner ? `
          <div style="display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 12px;">
            <button onclick="Views.detail.editLog()" 
                    style="background: var(--color-surface); border: 0.5px solid var(--color-border); color: var(--color-text); padding: 8px 16px; border-radius: var(--radius-md); font-size: 13px; cursor: pointer; font-weight: 500;">
              編集
            </button>
            <button onclick="Views.detail.deleteLog()" 
                    style="background: var(--color-surface); border: 0.5px solid var(--color-danger); color: var(--color-danger); padding: 8px 16px; border-radius: var(--radius-md); font-size: 13px; cursor: pointer; font-weight: 500;">
              削除
            </button>
          </div>
        ` : ''}
        
        <div class="log-badges" style="margin-bottom: 12px;">
          <span class="badge badge-cat-${this.sanitizeCat(log.category)}">${escapeHtml(log.category)}</span>
          ${log.phase ? `<span class="badge badge-phase">${escapeHtml(log.phase)}</span>` : ''}
        </div>
        
        <h2 style="font-size: 19px; font-weight: 600; line-height: 1.5; margin: 0 0 16px 0;">
          ${escapeHtml(log.title)}
        </h2>
        
        <div class="form-info" style="margin-bottom: 16px;">
          <div class="form-info-label">投稿者</div>
          <div class="form-info-value">${escapeHtml(log.authorName)} ${log.authorAffiliation ? '(' + escapeHtml(log.authorAffiliation) + ')' : ''}</div>
          <div class="form-info-label" style="margin-top: 8px;">投稿日時</div>
          <div class="form-info-value">${formatDateTime(log.postedDate)}</div>
          ${log.disasterName ? `
            <div class="form-info-label" style="margin-top: 8px;">関連案件</div>
            <div class="form-info-value">${escapeHtml(log.disasterName)}</div>
          ` : ''}
        </div>
        
        <div class="form-group">
          <label class="form-label">内容</label>
          <div style="background: var(--color-surface); padding: 14px 16px; border-radius: var(--radius-md); border: 0.5px solid var(--color-border-light); font-size: 16px; line-height: 1.8; white-space: pre-wrap;">${escapeHtml(log.content)}</div>
        </div>
        
        ${log.tags ? `
          <div class="form-group">
            <label class="form-label">タグ</label>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${log.tags.split(',').map(t => t.trim()).filter(t => t).map(t => 
                `<span style="background: var(--color-surface-alt); color: var(--color-text-muted); font-size: 12px; padding: 5px 12px; border-radius: 14px;">${escapeHtml(t)}</span>`
              ).join('')}
            </div>
          </div>
        ` : ''}
        
        ${hasAttachments ? `
          <div class="form-group">
            <label class="form-label">添付ファイル (${log.attachments.length}個)</label>
            <div id="attachment-list" style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${log.attachments.map((att, i) => {
                const isImg = this.isImage(att.contentType);
                const icon = this.getFileIcon(att.contentType);
                return `
                <div class="attachment-item" data-filekey="${escapeHtml(att.fileKey)}" data-index="${i}" data-mime="${escapeHtml(att.contentType || '')}" data-name="${escapeHtml(att.name || '')}" 
                     style="width: 110px; min-height: 110px; border-radius: var(--radius-md); border: 0.5px solid var(--color-border); background: var(--color-surface-alt); display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; padding: 8px; text-align: center;">
                  ${isImg
                    ? `<div class="att-content" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--color-text-muted);">読み込み中...</div>`
                    : `<div style="font-size: 36px; line-height: 1;">${icon}</div>
                       <div style="font-size: 11px; color: var(--color-text); margin-top: 6px; word-break: break-all; line-height: 1.3; font-weight: 500;">${escapeHtml((att.name || '').substring(0, 24))}</div>
                       <div style="font-size: 10px; color: var(--color-primary); margin-top: 4px;">タップで開く</div>`
                  }
                </div>
              `;
              }).join('')}
            </div>
          </div>
        ` : ''}
        
        ${log.remarks ? `
          <div class="form-group">
            <label class="form-label">備考</label>
            <div style="background: var(--color-surface); padding: 12px 14px; border-radius: var(--radius-md); border: 0.5px solid var(--color-border-light); font-size: 14px; line-height: 1.7; white-space: pre-wrap; color: var(--color-text-muted);">${escapeHtml(log.remarks)}</div>
          </div>
        ` : ''}
      </div>
      
      <div id="image-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; align-items: center; justify-content: center; padding: 20px;" onclick="Views.detail.closeModal()">
        <img id="modal-image" style="max-width: 100%; max-height: 100%; object-fit: contain;">
      </div>
    `;
  },
  
  async loadAttachments() {
    const log = this.state.log;
    if (!log || !log.attachments || log.attachments.length === 0) return;
    
    for (let i = 0; i < log.attachments.length; i++) {
      const att = log.attachments[i];
      const fileKey = att.fileKey;
      const isImg = this.isImage(att.contentType);
      
      const itemEl = document.querySelector(`.attachment-item[data-index="${i}"]`);
      if (!itemEl) continue;
      
      if (isImg) {
        // 画像はサムネイル表示
        try {
          let dataUrl = this.state.imageCache[fileKey];
          if (!dataUrl) {
            const base64 = await this.fetchFileAsBase64(fileKey);
            dataUrl = `data:${att.contentType || 'image/jpeg'};base64,${base64}`;
            this.state.imageCache[fileKey] = dataUrl;
          }
          
          itemEl.innerHTML = `<img src="${dataUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
          itemEl.style.padding = '0';
          itemEl.addEventListener('click', () => this.openModal(dataUrl));
        } catch (e) {
          itemEl.innerHTML = '<div style="font-size: 11px; color: var(--color-danger);">取得失敗</div>';
        }
      } else {
        // それ以外はタップでダウンロード/開く
        itemEl.addEventListener('click', () => {
          this.downloadFile(fileKey, att.name, att.contentType);
        });
      }
    }
  },
  
  /**
   * ファイルをダウンロードまたは新規タブで開く
   */
  async downloadFile(fileKey, fileName, mimeType) {
    App.showLoading(true);
    try {
      const base64 = await this.fetchFileAsBase64(fileKey);
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType || 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);
      
      // PDFはブラウザで開く、それ以外はダウンロード
      if (mimeType === 'application/pdf') {
        const newWin = window.open(blobUrl, '_blank');
        if (!newWin) {
          // ポップアップブロックされた場合はダウンロード
          this.triggerDownload(blobUrl, fileName);
        }
      } else {
        this.triggerDownload(blobUrl, fileName);
      }
      
      // メモリ解放 (少し遅延)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      
      App.showLoading(false);
    } catch (e) {
      App.showLoading(false);
      App.showError('ファイルの取得に失敗しました: ' + e.message);
    }
  },
  
  triggerDownload(blobUrl, fileName) {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },
  
  fetchFileAsBase64(fileKey) {
    return new Promise((resolve, reject) => {
      const token = getToken();
      const url = `${CONFIG.GAS_URL}?action=getFile&token=${encodeURIComponent(token)}&fileKey=${encodeURIComponent(fileKey)}`;
      
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .then(text => resolve(text))
        .catch(err => reject(err));
    });
  },
  
  openModal(dataUrl) {
    document.getElementById('modal-image').src = dataUrl;
    document.getElementById('image-modal').style.display = 'flex';
  },
  
  closeModal() {
    document.getElementById('image-modal').style.display = 'none';
  },
  
  editLog() {
    Views.post.initEdit(this.state.log);
    App.navigate('post');
  },
  
  async deleteLog() {
    if (!confirm('この活動ログを削除します。よろしいですか？\nこの操作は取り消せません。')) {
      return;
    }
    
    App.showLoading(true);
    try {
      await API.post('deleteLog', { recordId: this.state.log.recordId });
      App.showLoading(false);
      
      if (Views.list && Views.list.invalidateCache) {
        Views.list.invalidateCache();
      }
      
      alert('削除しました');
      App.navigate('list');
    } catch (e) {
      App.showLoading(false);
      App.showError('削除に失敗しました: ' + e.message);
    }
  },
  
  sanitizeCat(cat) {
    return cat ? cat.replace(/[^a-zA-Z\u4e00-\u9faf]/g, '') : '';
  }
};
