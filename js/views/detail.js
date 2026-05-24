// =========================================
// 活動ログ詳細画面 (派遣先表示対応)
// =========================================
Views.detail = {
  state: {
    log: null,
    loading: false,
    imageCache: {},
    appState: null,
    comments: [],
    commentsLoaded: false,
    editingCommentId: null,
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
    this.state.comments = [];
    this.state.commentsLoaded = false;
    this.state.editingCommentId = null;
    
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
    this.loadComments();
  },
  
  renderLoading(container) {
    container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--color-text-light);">読み込み中...</div>';
  },
  
  renderLog(container) {
    const log = this.state.log;
    const advisor = this.state.appState.advisor;
    const hasAttachments = log.attachments && log.attachments.length > 0;
    const isOwner = advisor && log.authorName === advisor.name;
    
    // 関連案件の表示 (災害名 + 派遣先)
    let dispatchHtml = '';
    if (log.disasterName) {
      dispatchHtml = `
        <div class="form-info-label" style="margin-top: 8px;">関連案件</div>
        <div class="form-info-value">${escapeHtml(log.disasterName)}${log.dispatchTo ? ' - ' + escapeHtml(log.dispatchTo) : ''}</div>
      `;
    }
    
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
          ${dispatchHtml}
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
        
        <!-- コメント欄 -->
        <div class="form-group" id="comments-section" style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--color-border-light);">
          <label class="form-label" id="comments-label">コメント</label>
          <div id="comments-list">
            <div style="padding: 16px; text-align: center; color: var(--color-text-light); font-size: 13px;">読み込み中...</div>
          </div>
          <div style="margin-top: 12px; padding: 12px; background: var(--color-surface); border: 0.5px solid var(--color-border-light); border-radius: var(--radius-md);">
            <textarea id="comment-input" class="form-textarea" placeholder="コメントを書く..." style="min-height: 60px; margin-bottom: 8px;"></textarea>
            <button onclick="Views.detail.submitComment()" class="btn btn-primary" style="height: 36px; padding: 0 20px; font-size: 13px;">
              コメントを投稿
            </button>
          </div>
        </div>
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
        itemEl.addEventListener('click', () => {
          this.downloadFile(fileKey, att.name, att.contentType);
        });
      }
    }
  },
  
  async loadComments() {
    if (!this.state.log) return;
    try {
      const data = await API.get('getComments', { recordId: this.state.log.recordId });
      this.state.comments = data.comments || [];
      this.state.commentsLoaded = true;
      this.renderComments();
      
      const advisor = this.state.appState.advisor;
      if (advisor && this.state.log.authorName === advisor.name) {
        const othersCount = this.state.comments.filter(c => c.authorName !== advisor.name).length;
        if (typeof UnreadManager !== 'undefined') {
          UnreadManager.markAsRead(this.state.log.recordId, othersCount);
        }
        if (App.state.myLogsCommentCounts) {
          const item = App.state.myLogsCommentCounts.find(i => i.logRecordId === this.state.log.recordId);
          if (item) {
            item.commentCount = othersCount;
          }
        }
      }
    } catch (e) {
      const listEl = document.getElementById('comments-list');
      if (listEl) {
        listEl.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--color-danger); font-size: 13px;">コメントの取得に失敗しました</div>';
      }
    }
  },
  
  renderComments() {
    const listEl = document.getElementById('comments-list');
    const labelEl = document.getElementById('comments-label');
    if (!listEl) return;
    
    const advisor = this.state.appState.advisor;
    const comments = this.state.comments;
    
    if (labelEl) {
      labelEl.textContent = `コメント (${comments.length})`;
    }
    
    if (comments.length === 0) {
      listEl.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--color-text-light); font-size: 13px;">まだコメントはありません</div>';
      return;
    }
    
    listEl.innerHTML = comments.map(c => {
      const isMine = advisor && c.authorName === advisor.name;
      const isEditing = this.state.editingCommentId === c.recordId;
      
      if (isEditing) {
        return `
          <div style="padding: 12px; background: var(--color-primary-light); border: 0.5px solid var(--color-primary); border-radius: var(--radius-md); margin-bottom: 8px;">
            <div style="font-size: 12px; color: var(--color-text-muted); margin-bottom: 6px;">
              <strong style="color: var(--color-text);">${escapeHtml(c.authorName)}</strong>
              ${c.authorAffiliation ? ' (' + escapeHtml(c.authorAffiliation) + ')' : ''}
              · ${formatDateTime(c.postedAt)}
            </div>
            <textarea id="edit-comment-${c.recordId}" class="form-textarea" style="min-height: 60px; margin-bottom: 8px;">${escapeHtml(c.body)}</textarea>
            <div style="display: flex; gap: 6px;">
              <button onclick="Views.detail.saveEditComment('${c.recordId}')" 
                      style="background: var(--color-primary); color: white; border: none; padding: 6px 14px; border-radius: var(--radius-md); font-size: 12px; cursor: pointer; font-weight: 500;">
                保存
              </button>
              <button onclick="Views.detail.cancelEditComment()" 
                      style="background: var(--color-surface); border: 0.5px solid var(--color-border); color: var(--color-text-muted); padding: 6px 14px; border-radius: var(--radius-md); font-size: 12px; cursor: pointer;">
                キャンセル
              </button>
            </div>
          </div>
        `;
      }
      
      return `
        <div style="padding: 12px; background: var(--color-surface); border: 0.5px solid var(--color-border-light); border-radius: var(--radius-md); margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div style="font-size: 12px; color: var(--color-text-muted);">
              <strong style="color: var(--color-text);">${escapeHtml(c.authorName)}</strong>
              ${c.authorAffiliation ? ' (' + escapeHtml(c.authorAffiliation) + ')' : ''}
              · ${formatDateTime(c.postedAt)}
            </div>
            ${isMine ? `
              <div style="display: flex; gap: 4px;">
                <button onclick="Views.detail.startEditComment('${c.recordId}')" 
                        style="background: none; border: none; color: var(--color-text-muted); font-size: 11px; cursor: pointer; padding: 2px 6px;">編集</button>
                <button onclick="Views.detail.deleteComment('${c.recordId}')" 
                        style="background: none; border: none; color: var(--color-danger); font-size: 11px; cursor: pointer; padding: 2px 6px;">削除</button>
              </div>
            ` : ''}
          </div>
          <div style="font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: var(--color-text);">${escapeHtml(c.body)}</div>
        </div>
      `;
    }).join('');
  },
  
  async submitComment() {
    const input = document.getElementById('comment-input');
    if (!input) return;
    const body = input.value.trim();
    if (!body) {
      alert('コメントを入力してください');
      return;
    }
    
    App.showLoading(true);
    try {
      await API.post('postComment', {
        logRecordId: this.state.log.recordId,
        body: body
      });
      input.value = '';
      await this.loadComments();
      App.showLoading(false);
    } catch (e) {
      App.showLoading(false);
      App.showError('コメント投稿に失敗しました: ' + e.message);
    }
  },
  
  startEditComment(commentId) {
    this.state.editingCommentId = commentId;
    this.renderComments();
  },
  
  cancelEditComment() {
    this.state.editingCommentId = null;
    this.renderComments();
  },
  
  async saveEditComment(commentId) {
    const textarea = document.getElementById('edit-comment-' + commentId);
    if (!textarea) return;
    const body = textarea.value.trim();
    if (!body) {
      alert('コメントを入力してください');
      return;
    }
    
    App.showLoading(true);
    try {
      await API.post('updateComment', { recordId: commentId, body: body });
      this.state.editingCommentId = null;
      await this.loadComments();
      App.showLoading(false);
    } catch (e) {
      App.showLoading(false);
      App.showError('コメント更新に失敗しました: ' + e.message);
    }
  },
  
  async deleteComment(commentId) {
    if (!confirm('このコメントを削除します。よろしいですか?')) return;
    
    App.showLoading(true);
    try {
      await API.post('deleteComment', { recordId: commentId });
      await this.loadComments();
      App.showLoading(false);
    } catch (e) {
      App.showLoading(false);
      App.showError('コメント削除に失敗しました: ' + e.message);
    }
  },
  
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
      
      if (mimeType === 'application/pdf') {
        const newWin = window.open(blobUrl, '_blank');
        if (!newWin) {
          this.triggerDownload(blobUrl, fileName);
        }
      } else {
        this.triggerDownload(blobUrl, fileName);
      }
      
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
