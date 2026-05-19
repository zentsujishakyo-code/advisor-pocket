// =========================================
// プロフィール画面
// =========================================
Views.profile = {
  state: {
    tel: '',
    email: '',
    status: '',
    saving: false
  },
  
  render(container, appState) {
    const { advisor, currentDispatch } = appState;
    
    // 初期値を本人情報からセット
    this.state.tel = advisor.tel || '';
    this.state.email = advisor.email || '';
    this.state.status = advisor.status || '登録中';
    
    container.innerHTML = `
      <div class="form-section">
        <div style="text-align: center; padding: 20px 0; border-bottom: 0.5px solid var(--color-border-light); margin-bottom: 16px;">
          <div style="width: 64px; height: 64px; border-radius: 50%; background: var(--color-primary-light); display: inline-flex; align-items: center; justify-content: center; font-size: 24px; color: var(--color-primary-dark); font-weight: 500; margin-bottom: 8px;">
            ${escapeHtml((advisor.name || '').charAt(0))}
          </div>
          <div style="font-size: 16px; font-weight: 500;">${escapeHtml(advisor.name)}</div>
          <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 2px;">${escapeHtml(advisor.affiliation)}</div>
        </div>
        
        <div class="form-info" style="margin-bottom: 16px; background: var(--color-primary-bg);">
          <div class="form-info-label" style="color: var(--color-primary-dark);">編集できる項目について</div>
          <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 4px; line-height: 1.6;">
            連絡先と派遣可否ステータスは本人が変更できます。<br>
            氏名・所属社協・スキル等は県社協担当者が管理します。
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">携帯電話</label>
          <input id="f-tel" class="form-input" type="tel" 
                 placeholder="090-0000-0000"
                 value="${escapeHtml(this.state.tel)}">
        </div>
        
        <div class="form-group">
          <label class="form-label">メールアドレス</label>
          <input id="f-email" class="form-input" type="email" 
                 placeholder="example@example.com"
                 value="${escapeHtml(this.state.email)}">
        </div>
        
        <div class="form-group">
          <label class="form-label">派遣可否ステータス</label>
          <select id="f-status" class="form-select">
            <option value="登録中" ${this.state.status === '登録中' ? 'selected' : ''}>登録中</option>
            <option value="派遣中" ${this.state.status === '派遣中' ? 'selected' : ''}>派遣中</option>
            <option value="派遣不可(一時)" ${this.state.status === '派遣不可(一時)' ? 'selected' : ''}>派遣不可(一時)</option>
            <option value="派遣不可(長期)" ${this.state.status === '派遣不可(長期)' ? 'selected' : ''}>派遣不可(長期)</option>
          </select>
          <div style="font-size: 11px; color: var(--color-text-muted); margin-top: 4px;">
            ※「退会」への変更は県社協担当者にご連絡ください。
          </div>
        </div>
        
        <div class="form-buttons" style="margin-top: 20px;">
          <button class="btn btn-secondary" onclick="App.navigate('home')">キャンセル</button>
          <button class="btn btn-primary" onclick="Views.profile.save()">保存する</button>
        </div>
      </div>
    `;
  },
  
  collectValues() {
    return {
      tel: document.getElementById('f-tel').value.trim(),
      email: document.getElementById('f-email').value.trim(),
      status: document.getElementById('f-status').value
    };
  },
  
  async save() {
    const data = this.collectValues();
    
    App.showLoading(true);
    try {
      await API.post('updateProfile', data);
      App.showLoading(false);
      
      // App.state.advisorも更新して、ホームに戻ったとき最新値で表示
      App.state.advisor.tel = data.tel;
      App.state.advisor.email = data.email;
      App.state.advisor.status = data.status;
      
      alert('保存しました');
      App.navigate('home');
    } catch (e) {
      App.showLoading(false);
      App.showError('保存に失敗しました: ' + e.message);
    }
  }
};
