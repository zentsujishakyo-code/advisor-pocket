// =========================================
// 活動ログ投稿/編集画面
// =========================================
Views.post = {
  state: {
    mode: 'new',
    recordId: null,
    category: '日報',
    phase: '',
    title: '',
    content: '',
    selectedTags: [],     // 選択中の定型タグ配列
    otherTags: '',         // 「その他」用の自由入力
    showOtherInput: false, // 「その他」入力欄を表示するか
    remarks: '',
    postedDate: '',        // 'YYYY-MM-DDTHH:mm' 形式
    existingAttachments: [],
    newAttachments: []
  },
  
  MAX_ATTACHMENTS: 3,
  MAX_DIMENSION: 1280,
  
  // 定型タグの候補
  PRESET_TAGS: [
    'ニーズ受付', 'マッチング', '資機材', '広報', '安全管理',
    '連携', '受付・運営', '移動・送迎', '衛生・健康', 'ガイダンス'
  ],
  
  initNew() {
    this.state = {
      mode: 'new',
      recordId: null,
      category: '日報',
      phase: '',
      title: '',
      content: '',
      selectedTags: [],
      otherTags: '',
      showOtherInput: false,
      remarks: '',
      postedDate: this.getNowLocalString(),
      existingAttachments: [],
      newAttachments: []
    };
  },
  
  initEdit(log) {
    // 既存タグ文字列を分解
    const tagArray = (log.tags || '').split(',').map(t => t.trim()).filter(t => t);
    const presetTags = tagArray.filter(t => this.PRESET_TAGS.indexOf(t) !== -1);
    const otherTagsArr = tagArray.filter(t => this.PRESET_TAGS.indexOf(t) === -1);
    
    this.state = {
      mode: 'edit',
      recordId: log.recordId,
      category: log.category || '日報',
      phase: log.phase || '',
      title: log.title || '',
      content: log.content || '',
      selectedTags: presetTags,
      otherTags: otherTagsArr.join(', '),
      showOtherInput: otherTagsArr.length > 0,
      remarks: log.remarks || '',
      postedDate: this.toLocalString(log.postedDate),
      existingAttachments: (log.attachments || []).map(a => ({
        fileKey: a.fileKey,
        name: a.name || '',
        contentType: a.contentType || 'image/jpeg'
      })),
      newAttachments: []
    };
  },
  
  /**
   * 現在時刻を 'YYYY-MM-DDTHH:mm' 形式で返す (datetime-local input用)
   */
  getNowLocalString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
  },
  
  /**
   * ISO文字列を 'YYYY-MM-DDTHH:mm' 形式に変換 (ローカル時刻)
   */
  toLocalString(isoString) {
    if (!isoString) return this.getNowLocalString();
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return this.getNowLocalString();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
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
            <div class="form-info-label" style="margin-top: 8px;">関連案件</div>
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
          <label class="form-label">投稿日時 <span class="required">*</span></label>
          <input id="f-posted-date" class="form-input" type="datetime-local" 
                 value="${s.postedDate}">
        </div>
        
        <div class="form-group">
          <label class="form-label">タイトル <span class="required">*</span></label>
          <input id="f-title" class="form-input" type="text" 
                 value="${escapeHtml(s.title)}">
        </div>
        
        <div class="form-group">
          <label class="form-label">内容 <span class="required">*</span></label>
          <textarea id="f-content" class="form-textarea">${escapeHtml(s.content)}</textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">タグ (タップで選択・複数可)</label>
          <div class="tag-buttons" id="f-tag-buttons">
            ${this.PRESET_TAGS.map(t => `
              <button type="button" class="tag-btn ${s.selectedTags.indexOf(t) !== -1 ? 'active' : ''}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>
            `).join('')}
            <button type="button" class="tag-btn ${s.showOtherInput ? 'active' : ''}" data-tag="__other__">その他</button>
          </div>
          <div id="f-tag-other-wrap" class="tag-other-input" style="display: ${s.showOtherInput ? 'block' : 'none'};">
            <input id="f-tag-other" class="form-input" type="text" 
                   placeholder="その他のタグ(カンマ区切り)" 
                   value="${escapeHtml(s.otherTags)}">
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">写真 (最大${this.MAX_ATTACHMENTS}枚)</label>
          <div id="attachments-preview" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
          </div>
          <input type="file" id="f-file-input" accept="image/*" multiple style="display: none;">
          <button type="button" id="f-add-photo-btn" class="btn btn-secondary" style="width: 100%; height: 44px;">
            写真を選ぶ・撮る
          </button>
          <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 6px;">
            自動で長辺${this.MAX_DIMENSION}pxに縮小されます
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">備考</label>
          <textarea id="f-remarks" class="form-textarea">${escapeHtml(s.remarks)}</textarea>
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
        const val = pill.dataset.value;
        // 同じものをタップしたら解除
        if (this.state.phase === val) {
          this.state.phase = '';
          pill.classList.remove('active');
        } else {
          container.querySelectorAll('#f-phase-group .pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.state.phase = val;
        }
      });
    });
    
    // タグボタン
    container.querySelectorAll('#f-tag-buttons .tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        if (tag === '__other__') {
          this.state.showOtherInput = !this.state.showOtherInput;
          btn.classList.toggle('active', this.state.showOtherInput);
          const wrapEl = document.getElementById('f-tag-other-wrap');
          if (wrapEl) wrapEl.style.display = this.state.showOtherInput ? 'block' : 'none';
        } else {
          const idx = this.state.selectedTags.indexOf(tag);
          if (idx === -1) {
            this.state.selectedTags.push(tag);
            btn.classList.add('active');
          } else {
            this.state.selectedTags.splice(idx, 1);
            btn.classList.remove('active');
          }
        }
      });
    });
    
    // 写真選択
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
        <button type="button" data-type="existing" data-index="${i}" class="remove-attachment" style="position: absolute; top: 2px; right: 2px; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,0.6); color: white; border: none; font-size: 14px; line-height: 1; cursor: pointer;">×</button>
      </div>
    `).join('');
    
    const newHtml = this.state.newAttachments.map((att, i) => `
      <div style="position: relative; width: 80px; height: 80px; border-radius: var(--radius-md); overflow: hidden; border: 0.5px solid var(--color-border);">
        <img src="${att.preview}" style="width: 100%; height: 100%; object-fit: cover;">
        <button type="button" data-type="new" data-index="${i}" class="remove-attachment" style="position: absolute; top: 2px; right: 2px; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,0.6); color: white; border: none; font-size: 14px; line-height: 1; cursor: pointer;">×</button>
      </div>
    `).join('');
    
    previewEl.innerHTML = existingHtml + newHtml;
    
    this.state.existingAttachments.forEach((att, i) => {
      this.loadExistingAttachment(att, i);
    });
    
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
      // 失敗時は「読み込み中...」のまま
    }
  },
  
  /**
   * タグをまとめてカンマ区切り文字列に
   */
  buildTagsString() {
    const tags = this.state.selectedTags.slice();
    if (this.state.showOtherInput) {
      const otherInputEl = document.getElementById('f-tag-other');
      const otherText = otherInputEl ? otherInputEl.value.trim() : '';
      if (otherText) {
        otherText.split(',').map(t => t.trim()).filter(t => t).forEach(t => {
          if (tags.indexOf(t) === -1) tags.push(t);
        });
      }
    }
    return tags.join(',');
  },
  
  collectValues() {
    return {
      recordId: this.state.recordId,
      category: document.getElementById('f-category').value,
      phase: this.state.phase,
      title: document.getElementById('f-title').value.trim(),
      content: document.getElementById('f-content').value.trim(),
      tags: this.buildTagsString(),
      remarks: document.getElementById('f-remarks').value.trim(),
      postedDate: document.getElementById('f-posted-date').value,
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
      App.navigate('detail', this.state.recordId);
    } else {
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
    if (!data.postedDate) { alert('投稿日時を入力してください'); return; }
    
    const isEdit = this.state.mode === 'edit';
    const action = isEdit ? 'updateLog' : 'postLog';
    
    if (!isEdit) {
      data.attachments = data.newAttachments;
      delete data.existingAttachments;
      delete data.newAttachments;
    }
    
    App.showLoading(true);
    try {
      await API.post(action, data);
      App.showLoading(false);
      
      if (Views.list && Views.list.invalidateCache) {
        Views.list.invalidateCache();
      }
      
      if (!isEdit) {
        localStorage.removeItem('advisor_pocket_draft');
      }
      
      const recordId = this.state.recordId;
      this.initNew();
      
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
