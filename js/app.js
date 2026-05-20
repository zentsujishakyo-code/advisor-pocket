// =========================================
// アプリのメインコントローラ
// =========================================

const App = {
  state: {
    advisor: null,
    currentDispatch: null,
    currentView: null,
  },
  
  init() {
    if (!getToken()) {
      this.showError('アクセス権限がありません。県社協担当者にお問い合わせください。');
      return;
    }
    this.loadMyInfo();
    
    document.getElementById('back-button').addEventListener('click', () => {
      // 戻るボタンの動作:
      // 編集中の投稿画面 → 詳細画面に戻る
      // 通常の投稿画面 → ホームに戻る
      // 詳細画面 → 一覧に戻る
      // それ以外 → ホームに戻る
      if (this.state.currentView === 'post' && Views.post.state.mode === 'edit') {
        const recordId = Views.post.state.recordId;
        Views.post.initNew();  // stateリセット
        this.navigate('detail', recordId);
      } else if (this.state.currentView === 'detail') {
        this.navigate('list');
      } else {
        this.navigate('home');
      }
    });
  },
  
  async loadMyInfo() {
    try {
      this.showLoading(true);
      const data = await API.get('getMyInfo');
      this.state.advisor = data.advisor;
      this.state.currentDispatch = data.currentDispatch;
      this.showLoading(false);
      document.getElementById('app-header').style.display = 'block';
      this.navigate('home');
    } catch (e) {
      this.showLoading(false);
      this.showError('情報の取得に失敗しました: ' + e.message);
    }
  },
  
  navigate(viewName, param) {
    const prevView = this.state.currentView;
    this.state.currentView = viewName;
    const main = document.getElementById('main-content');
    const backBtn = document.getElementById('back-button');
    const title = document.getElementById('page-title');
    
    switch (viewName) {
      case 'home':
        backBtn.style.display = 'none';
        title.textContent = 'アドバイザーポケット';
        Views.home.render(main, this.state);
        break;
      case 'post':
        backBtn.style.display = 'block';
        // 新規モードに切り替えるのは、ホームから来た場合だけ
        // (詳細画面から「編集」で来た場合は、すでにinitEdit済みなのでそのまま使う)
        if (prevView === 'home' || prevView === null) {
          Views.post.initNew();
        }
        title.textContent = Views.post.state.mode === 'edit' ? '活動ログを編集' : '活動ログを書く';
        Views.post.render(main, this.state);
        break;
      case 'list':
        backBtn.style.display = 'block';
        title.textContent = '活動ログを見る';
        Views.list.render(main, this.state);
        break;
      case 'detail':
        backBtn.style.display = 'block';
        title.textContent = '活動ログ詳細';
        Views.detail.render(main, this.state, param);
        break;
      case 'profile':
        backBtn.style.display = 'block';
        title.textContent = 'プロフィール';
        Views.profile.render(main, this.state);
        break;
    }
    window.scrollTo(0, 0);
  },
  
  showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
  },
  
  showError(message) {
    const banner = document.getElementById('error-banner');
    document.getElementById('error-message').textContent = message;
    banner.style.display = 'flex';
  }
};

function closeError() {
  document.getElementById('error-banner').style.display = 'none';
}

// 起動
document.addEventListener('DOMContentLoaded', () => App.init());

// グローバルなViews名前空間
const Views = {};
