// =========================================
// GAS API 呼び出し
// =========================================

const API = {
  /**
   * 読み込み系API (JSONPでCORS回避)
   */
  get(action, params = {}) {
    return new Promise((resolve, reject) => {
      const callbackName = 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      const token = getToken();
      
      // タイムアウト処理
      const timeoutId = setTimeout(() => {
        delete window[callbackName];
        document.head.removeChild(script);
        reject(new Error('タイムアウトしました'));
      }, 15000);
      
      // コールバック関数を一時的にwindowに登録
      window[callbackName] = (data) => {
        clearTimeout(timeoutId);
        delete window[callbackName];
        document.head.removeChild(script);
        if (data.error) {
          reject(new Error(data.error));
        } else {
          resolve(data);
        }
      };
      
      // スクリプトタグを挿入してJSONPリクエスト
      const queryString = Object.entries({
        action, token, callback: callbackName, ...params
      }).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      
      const script = document.createElement('script');
      script.src = `${CONFIG.GAS_URL}?${queryString}`;
      script.onerror = () => {
        clearTimeout(timeoutId);
        delete window[callbackName];
        reject(new Error('通信に失敗しました'));
      };
      document.head.appendChild(script);
    });
  },
  
  /**
   * 書き込み系API (text/plainでpreflight回避)
   */
  post(action, data) {
    const token = getToken();
    return fetch(CONFIG.GAS_URL, {
      method: 'POST',
      mode: 'no-cors',  // GAS制約上の必要設定
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token, data })
    }).then(() => {
      // no-corsモードでは戻り値が読めないため、楽観的にsuccessとする
      // 実用上は別途確認APIで成功検証する
      return { optimistic: true };
    });
  }
};


// =========================================
// トークン管理
// =========================================
const TOKEN_KEY = 'advisor_pocket_token';

function getToken() {
  // URLパラメータ優先、なければLocalStorageから
  const urlParams = new URLSearchParams(window.location.search);
  const fromUrl = urlParams.get('t');
  if (fromUrl) {
    localStorage.setItem(TOKEN_KEY, fromUrl);
    // URLからトークンを消す (履歴に残さない)
    window.history.replaceState({}, '', window.location.pathname);
    return fromUrl;
  }
  return localStorage.getItem(TOKEN_KEY) || '';
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
