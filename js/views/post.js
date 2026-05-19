// =========================================
// 活動ログ投稿画面
// =========================================
Views.post = {
  state: {
    category: '日報',
    phase: '',
    title: '',
    content: '',
    tags: '',
    remarks: '',
    attachments: []  // [{ data: base64, mimeType, fileName, preview }]
  },
  
  MAX_ATTACHMENTS: 3,
  MAX_DIMENSION: 1280,
  
  render(container, appState) {
    const { advisor, currentDispatch } = appState;
    const s = this.state;
    
    container.innerHTML = `
      <div class="form-section">
        <div class="form-info">
          <div class="form-info-label">投稿者</div>
          <div class="form-info-value">${escapeHtml(advisor.name)} (${escapeHtml(advisor.affiliation)})</div>
          ${currentDispatch ? `
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
          <button class="btn btn-secondary" onclick="Views.post.saveDraft()">下書き保存</button>
          <button class="btn btn-primary" onclick="Views.post.submit()">送信する</button>
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
      if (this.state.attachments.length >= this.MAX_ATTACHMENTS) {
        alert(`写真は最大${this.MAX_ATTACHMENTS}枚までです`);
        return;
      }
      document.getElementById('f-file-input').click();
    });
    
    // ファイル選択時
    document.getElementById('f-file-input').addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files);
    });
    
    this.renderAttachmentsPreview();
  },
  
  /**
   * ファイル選択時の処理 - リサイズしてstateに保存
   */
  async handleFileSelect(files) {
    for (const file of files) {
      if (this.state.attachments.length >= this.MAX_ATTACHMENTS) {
        alert(`写真は最大${this.MAX_ATTACHMENTS}枚までです`);
        break;
      }
      
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください');
        continue;
      }
      
      try {
        const resized = await this.resizeImage(file, this.MAX_DIMENSION);
        this.state.attachments.push(resized);
        this.renderAttachmentsPreview();
      } catch (e) {
        alert('画像の処理に失敗しました: ' + e.message);
      }
    }
    
    // ファイル選択欄を空にして、同じファイルを再選択できるように
    document.getElementById('f-file-input').value = '';
  },
  
  /**
   * 画像を指定サイズにリサイズしてBase64で返す
   */
  resizeImage(file, maxDimension) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          
          // 長辺を maxDimension に合わせて縮小
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
          
          // JPEG形式・品質85%でエンコード
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const base64 = dataUrl.split(',')[1];
          
          resolve({
            data: base64,
            mimeType: 'image/jpeg',
            fileName: file.name.replace(/\.[^.]+$/, '.jpg'),
            preview: dataUrl,
            size: Math.round(base64.length * 3 / 4)
          });
        };
        img.onerror = () => reject(new Error('画像読み込み失敗'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('ファイル読み込み失敗'));
      reader.readAsDataURL(file);
    });
  },
  
  /**
   * 添付ファイルプレビューを描画
   */
  renderAttachmentsPreview() {
    const previewEl = document.getElementById('attachments-preview');
    if (!previewEl) return;
    
    previewEl.innerHTML = this.state.attachments.map((att, i) => `
      <div style="position: relative; width: 80px; height: 80px; border-radius: var(--radius-md); overflow: hidden; border: 0.5px solid var(--color-border);">
        <img src="${att.preview}" style="width: 100%; height: 100%; object-fit: cover;">
        <button type="button" data-index="${i}" class="remove-attachment" style="position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; border-radius: 50%; background: rgba(0,0,0,0.6); color: white; border: none; font-size: 12px; line-height: 1; cursor: pointer;">×</button>
      </div>
    `).join('');
    
    previewEl.querySelectorAll('.remove-attachment').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.state.attachments.splice(idx, 1);
        this.renderAttachmentsPreview();
      });
    });
  },
  
  collectValues() {
    return {
      category: document.getElementById('f-category').value,
      phase: this.state.phase,
      title: document.getElementById('f-title').value.trim(),
      content: document.getElementById('f-content').value.trim(),
      tags: document.getElementById('f-tags').value.trim(),
      remarks: document.getElementById('f-remarks').value.trim(),
      attachments: this.state.attachments.map(a => ({
        data: a.data,
        mimeType: a.mimeType,
        fileName: a.fileName
      }))
    };
  },
  
  saveDraft() {
    const data = this.collectValues();
    // 添付ファイル(Base64)はLocalStorage容量を圧迫するため、下書きには含めない
    delete data.attachments;
    localStorage.setItem('advisor_pocket_draft', JSON.stringify(data));
    alert('下書きを保存しました (写真は下書きに含まれません)');
  },
  
  async submit() {
    const data = this.collectValues();
    
    if (!data.title) { alert('タイトルを入力してください'); return; }
    if (!data.content) { alert('内容を入力してください'); return; }
    if (!data.category) { alert('種別を選択してください'); return; }
    
    App.showLoading(true);
    try {
      await API.post('postLog', data);
      App.showLoading(false);
      localStorage.removeItem('advisor_pocket_draft');
      this.state = { 
        category: '日報', phase: '', title: '', content: '', 
        tags: '', remarks: '', attachments: [] 
      };
      alert('投稿しました');
      App.navigate('home');
    } catch (e) {
      App.showLoading(false);
      App.showError('投稿に失敗しました: ' + e.message);
    }
  }
};
