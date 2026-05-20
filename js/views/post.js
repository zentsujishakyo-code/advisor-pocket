// =========================================
// 活動ログ投稿/編集画面
// =========================================
Views.post = {
  state: {
    mode: 'new',           // 'new' or 'edit'
    recordId: null,        // 編集モードの場合のレコードID
    category: '日報',
    phase: '',
    title: '',
    content: '',
    tags: '',
    remarks: '',
    existingAttachments: [], // 編集モード時の既存添付 [{fileKey, name, contentType}]
    newAttachments: []     // 新規追加した添付 [{data, mimeType, fileName, preview}]
  },
  
  MAX_ATTACHMENTS: 3,
  MAX_DIMENSION: 1280,
  
  /**
   * 新規モードの初期化
   */
  initNew() {
    this.state = {
      mode: 'new',
      recordId: null,
      category: '日報',
      phase: '',
      title: '',
      content: '',
      tags: '',
      remarks: '',
      existingAttachments: [],
      newAttachments: []
    };
  },
  
  /**
   * 編集モードの初期化 (既存ログの値で埋める)
   */
  initEdit(log) {
    this.state = {
      mode: 'edit',
      recordId: log.recordId,
      category: log.category || '日報',
      phase: log.phase || '',
      title: log.title || '',
      content: log.content || '',
      tags: log.tags || '',
      remarks: log.remarks || '',
      existingAttachments: (log.attachments || []).map(a => ({
        fileKey: a.fileKey,
        name: a.name || '',
        contentType: a.contentType || 'image/jpeg'
      })),
      newAttachments: []
    };
  },
  
  render(container, appState) {
    const { advisor, currentDispatch } = appState;
    const s = this.state;
    const isEdit = s.mode === 'edit';
    
    container.innerHTML = `
      <div class="form-section">
        <div class="form-info">
          <div class="form-info-label">投稿者</div>
          <div class="form-info-value">${escapeHtml(advisor.name)} (${escapeHtml(advisor.affiliation)})</div>
          ${currentDispatch && !isEdit ? `
            <div class="form-info-label" style="margin-top: 6px;">関連案件</div>
            <div class="form-info-value">${escapeHtml(currentDispatch.disasterName)}</div>
          ` : ''}
        </div>
        
        <div class="form-group">
          <label class="form-label">種別 <span class="required">*</span></label>
          <select id="f-category" class="form-select">
            <option value="日報" ${s.category === '日報' ? 'selected' : ''}>日報</option>
            <option value="Tips" ${s.category === 'Tips' ? 'selected' : ''}>Tips</option>
            <option value="失敗談" ${s.category === '失敗談' ? 'selected' : ''}>失敗談</option>
            <option value="Q＆A" ${s.category === 'Q＆A' ? 'selected' : ''}>Q&amp;A</option>
            <option value="資料共有" ${s.category === '資料共有' ? 'selected' : ''}>資料共有</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">フェーズ</label>
          <div class="pill-group" id="f-phase-group">
            ${['立ち上げ期', '安定期', '縮小期', '閉所'].map(p => `
              <div class="pill ${s.phase === p ? 'active' : ''}" data-value="${p}">${p}</div>
            `).join('')}
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">タイトル <span class="required">*</span></label>
          <input id="f-title" class="form-input" type="text" 
                 placeholder="ニーズ受付電話の混乱を防ぐコツ"
                 value="${escapeHtml(s.title)}">
        </div>
        
        <div class="form-group">
          <label class="form-label">内容 <span class="required">*</span></label>
          <textarea id="f-content" class="form-textarea" 
                    placeholder="現場で気づいたこと、後の人に伝えたいことを書いてください">${escapeHtml(s.content)}</textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">タグ (カンマ区切り)</label>
          <input id="f-tags" class="form-input" type="text" 
                 placeholder="電話対応, ニーズ受付"
                 value="${escapeHtml(s.tags)}">
        </div>
        
        <div class="form-group">
          <label class="form-label">写真 (最大${this.MAX_ATTACHMENTS}枚)</label>
          <div id="attachments-preview" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
            <!-- プレビューはJSで動的描画 -->
          </div>
          <input type="file" id="f-file-input" accept="image/*" multiple style="display: none;">
          <button type="button" id="f-add-photo-btn" class="btn btn-secondary" style="width: 100%; height: 40px;">
            写真を選ぶ・撮る
          </button>
          <div style="font-size: 11px; color: var(--color-text-muted); margin-top: 4px;">
            自動で長辺${this.MAX_DIMENSION}pxに縮小されます
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">備考</label>
          <textarea id="f-remarks" class="form-textarea" 
                    placeholder="補足や、その他伝えておきたいこと">${escapeHtml(s.remarks)}</textarea>
        </div>
        
        <div class="form-buttons">
          <button class="btn btn-secondary" onclick="Views.post.cancel()">${isEdit ? 'キャンセル' : '下書き保存'}</button>
          <button class="btn btn-primary" onclick="Views.post.submit()">${isEdit ? '更新する' : '送信する'}</button>
        </div>
      </div>
    `;
    
    // フェーズピル
    container.querySelectorAll('#f-phase-group .pill').forEach(pill => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('#f-phase-group .pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.state.phase = pill.dataset.value;
      });
    });
    
    // 写真選択ボタン
    document.getElementById('f-add-photo-btn').addEventListener('click', () => {
      const total = this.state.existingAttachments.length + this.state.newAttachments.length;
      if (total >= this.MAX_ATTACHMENTS) {
        alert(`写真は最大${this.MAX_ATTACHMENTS}枚までです`);
        return;
      }
      document.getElementById('f-file-input').click();
    });
    
    document.getElementById('f-file-input').addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files);
    });
    
    this.renderAttachmentsPreview();
  },
  
  async handleFileSelect(files) {
    for (const file of files) {
      const total = this.state.existingAttachments.length + this.state.newAttachments.length;
      if (total >= this.MAX_ATTACHMENTS) {
        alert(`写真は最大${this.MAX_ATTACHMENTS}枚までです`);
        break;
      }
      
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください');
        continue;
      }
      
      try {
        const resized = await this.resizeImage(file, this.MAX_DIMENSION);
        this.state.newAttachments.push(resized);
        this.renderAttachmentsPreview();
      } catch (e) {
        alert('画像の処理に失敗しました: ' + e.message);
      }
    }
    
    document.getElementById('f-file-input').value = '';
  },
  
  resizeImage(file, maxDimension) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round(height * maxDimension / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round(width * maxDimension / height);
              height = maxDimension;
            }
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const base64 = dataUrl.split(',')[1];
          
          resolve({
            data: base64,
            mimeType: 'image/jpeg',
            fileName: file.name.replace(/\.[^.]+$/, '.jpg'),
            preview: dataUrl
          });
        };
        img.onerror = () => reject(new Error('画像読み込み失敗'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('ファイル読み込み失敗'));
      reader.readAsDataURL(file);
    });
  },
  
  renderAttachmentsPreview() {
    const previewEl = document.getElementById('attachments-preview');
    if (!previewEl) return;
    
    const existingHtml = this.state.existingAttachments.map((att, i) => `
      <div style="position: relative; width: 80px; height: 80px; border-radius: var(--radius-md); overflow: hidden; border: 0.5px solid var(--color-border); background: var(--color-surface-alt);" data-existing-index="${i}">
        <div class="att-img-slot" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--color-text-muted);">読み込み中...</div>
        <button type="button" data-type="existing" data-index="${i}" class="remove-attachment" style="position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; border-radius: 50%; background: rgba(0,0,0,0.6); color: white; border: none; font-size: 12px; line-height: 1; cursor: pointer;">×</button>
      </div>
    `).join('');
    
    const newHtml = this.state.newAttachments.map((att, i) => `
      <div style="position: relative; width: 80px; height: 80px; border-radius: var(--radius-md); overflow: hidden; border: 0.5px solid var(--color-border);">
        <img src="${att.preview}" style="width: 100%; height: 100%; object-fit: cover;">
        <button type="button" data-type="new" data-index="${i}" class="remove-attachment" style="position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; border-radius: 50%; background: rgba(0,0,0,0.6); color: white; border: none; font-size: 12px; line-height: 1; cursor: pointer;">×</button>
      </div>
    `).join('');
    
    previewEl.innerHTML = existingHtml + newHtml;
    
    // 既存添付ファイルの画像を非同期で読み込む
    this.state.existingAttachments.forEach((att, i) => {
      this.loadExistingAttachment(att, i);
    });
    
    // 削除ボタン
    previewEl.querySelectorAll('.remove-attachment').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.target.dataset.type;
        const idx = parseInt(e.target.dataset.index, 10);
        if (type === 'existing') {
          this.state.existingAttachments.splice(idx, 1);
        } else {
          this.state.newAttachments.splice(idx, 1);
        }
        this.renderAttachmentsPreview();
      });
    });
  },
  
  /**
   * 既存の添付ファイル(fileKey)から画像を読み込んでプレビュー表示
   */
  async loadExistingAttachment(att, index) {
    try {
      const token = getToken();
      const url = `${CONFIG.GAS_URL}?action=getFile&token=${encodeURIComponent(token)}&fileKey=${encodeURIComponent(att.fileKey)}`;
      const res = await fetch(url);
      const base64 = await res.text();
      const dataUrl = `data:${att.contentType || 'image/jpeg'};base64,${base64}`;
      
      const slotEl = document.querySelector(`[data-existing-index="${index}"] .att-img-slot`);
      if (slotEl) {
        slotEl.innerHTML = `<img src="${dataUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
        slotEl.style.padding = '0';
      }
    } catch (e) {
      // 失敗時は「読み込み中...」のまま残る
    }
  },
  
  collectValues() {
    return {
      recordId: this.state.recordId,
      category: document.getElementById('f-category').value,
      phase: this.state.phase,
      title: document.getElementById('f-title').value.trim(),
      content: document.getElementById('f-content').value.trim(),
      tags: document.getElementById('f-tags').value.trim(),
      remarks: document.getElementById('f-remarks').value.trim(),
      existingAttachments: this.state.existingAttachments.map(a => a.fileKey),
      newAttachments: this.state.newAttachments.map(a => ({
        data: a.data,
        mimeType: a.mimeType,
        fileName: a.fileName
      }))
    };
  },
  
  cancel() {
    if (this.state.mode === 'edit') {
      // 編集モードのキャンセル: 詳細画面に戻る
      App.navigate('detail', this.state.recordId);
    } else {
      // 新規モードの「下書き保存」: LocalStorageに退避
      const data = this.collectValues();
      delete data.newAttachments;
      delete data.existingAttachments;
      localStorage.setItem('advisor_pocket_draft', JSON.stringify(data));
      alert('下書きを保存しました (写真は下書きに含まれません)');
    }
  },
  
  async submit() {
    const data = this.collectValues();
    
    if (!data.title) { alert('タイトルを入力してください'); return; }
    if (!data.content) { alert('内容を入力してください'); return; }
    if (!data.category) { alert('種別を選択してください'); return; }
    
    const isEdit = this.state.mode === 'edit';
    const action = isEdit ? 'updateLog' : 'postLog';
    
    // 新規投稿の場合は attachments を従来形式に
    if (!isEdit) {
      data.attachments = data.newAttachments;
      delete data.existingAttachments;
      delete data.newAttachments;
    }
    
    App.showLoading(true);
    try {
      await API.post(action, data);
      App.showLoading(false);
      
      if (!isEdit) {
        localStorage.removeItem('advisor_pocket_draft');
      }
      
      const recordId = this.state.recordId;
      this.initNew();  // stateをリセット
      
      alert(isEdit ? '更新しました' : '投稿しました');
      
      if (isEdit) {
        App.navigate('detail', recordId);
      } else {
        App.navigate('home');
      }
    } catch (e) {
      App.showLoading(false);
      App.showError((isEdit ? '更新' : '投稿') + 'に失敗しました: ' + e.message);
    }
  }
};
