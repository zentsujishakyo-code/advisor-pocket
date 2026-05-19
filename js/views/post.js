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
    remarks: ''
  },
  
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
    
    // フェーズピルのクリック処理
    container.querySelectorAll('#f-phase-group .pill').forEach(pill => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('#f-phase-group .pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.state.phase = pill.dataset.value;
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
      remarks: document.getElementById('f-remarks').value.trim()
    };
  },
  
  saveDraft() {
    const data = this.collectValues();
    localStorage.setItem('advisor_pocket_draft', JSON.stringify(data));
    alert('下書きを保存しました');
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
      this.state = { category: '日報', phase: '', title: '', content: '', tags: '', remarks: '' };
      alert('投稿しました');
      App.navigate('home');
    } catch (e) {
      App.showLoading(false);
      App.showError('投稿に失敗しました: ' + e.message);
    }
  }
};
