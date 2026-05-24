// =========================================
// アプリのメインコントローラ (複数派遣対応)
// =========================================

const App = {
  state: {
    advisor: null,
    currentDispatches: [],  // 配列に変更
    currentView: null,
    myLogsCommentCounts: [],
  },
  
  init() {
    if (!getToken()) {
      this.showError('アクセス権限がありません。県社協担当者にお問い合わせください。');
      return;
    }
    
    document.getElementById('app-header').style.display = 'block';
    document.getElementById('loading').style.display = 'none';
    Views.home.renderSkeleton(document.getElementById('main-content'));
    this.state.currentView = 'home';
    
    this.loadMyInfo();
    
    document.getElementById('back-button').addEventListener('click', () => {
      if (this.state.currentView === 'post' && Views.post.state.mode === 'edit') {
        const recordId = Views.post.state.recordId;
        Views.post.initNew();
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
      const data = await API.get('getMyInfo');
      this.state.advisor = data.advisor;
      this.state.currentDispatches = data.currentDispatches || [];
      
      if (this.state.currentView === 'home') {
        Views.home.render(document.getElementById('main-content'), this.state);
      }
      
      this.loadUnreadCount();
      this.loadRecentLogs();
    } catch (e) {
      this.showError('情報の取得に失敗しました: ' + e.message);
    }
  },
  
  async loadUnreadCount() {
    try {
      const data = await API.get('getMyLogsCommentCounts');
      if (data.error) return;
      this.state.myLogsCommentCounts = data.items || [];
      
      const unreadCount = UnreadManager.countUnread(this.state.myLogsCommentCounts);
      Views.home.setUnreadCount(unreadCount);
      
      if (this.state.currentView === 'home' && this.state.advisor) {
        Views.home.render(document.getElementById('main-content'), this.state);
      }
    } catch (e) {
    }
  },
  
  async loadRecentLogs() {
    try {
      const data = await API.get('getLogs', { limit: 3, sortOrder: 'desc' });
      if (data.error) return;
      Views.home.setRecentLogs(data.logs || []);
      
      if (this.state.currentView === 'home' && this.state.advisor) {
        Views.home.render(document.getElementById('main-content'), this.state);
      }
    } catch (e) {
    }
  },
  
  setHeader(title, showSubtitle) {
    document.getElementById('page-title').textContent = title;
    const subEl = document.getElementById('page-subtitle');
    if (subEl) {
      subEl.style.display = showSubtitle ? 'inline' : 'none';
    }
  },
  
  navigate(viewName, param) {
    const prevView = this.state.currentView;
    this.state.currentView = viewName;
    const main = document.getElementById('main-content');
    const backBtn = document.getElementById('back-button');
    
    switch (viewName) {
      case 'home':
        backBtn.style.display = 'none';
        this.setHeader('アドバイザーポケット', true);
        if (this.state.advisor) {
          Views.home.render(main, this.state);
          this.loadUnreadCount();
          this.loadRecentLogs();
        } else {
          Views.home.renderSkeleton(main);
        }
        break;
      case 'post':
        backBtn.style.display = 'block';
        if (prevView === 'home' || prevView === null) {
          Views.post.initNew();
        }
        this.setHeader(Views.post.state.mode === 'edit' ? '活動ログを編集' : '活動ログを書く', false);
        Views.post.render(main, this.state);
        break;
      case 'list':
        backBtn.style.display = 'block';
        this.setHeader('活動ログを見る', false);
        Views.list.render(main, this.state);
        break;
      case 'detail':
        backBtn.style.display = 'block';
        this.setHeader('活動ログ詳細', false);
        Views.detail.render(main, this.state, param);
        break;
      case 'profile':
        backBtn.style.display = 'block';
        this.setHeader('プロフィール', false);
        Views.profile.render(main, this.state);
        break;
      case 'howto':
        backBtn.style.display = 'block';
        this.setHeader('使い方ガイド', false);
        Views.howto.render(main, this.state);
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

document.addEventListener('DOMContentLoaded', () => App.init());

const Views = {};
