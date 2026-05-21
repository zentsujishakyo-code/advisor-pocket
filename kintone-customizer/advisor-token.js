/**
 * kintone カスタマイズ: アドバイザートークン管理ボタン
 * 
 * 対象アプリ: ①アドバイザー名簿
 * 機能:
 *   1. レコード詳細画面に「トークン発行」「URLコピー」ボタンを追加
 *   2. トークン発行: 32文字ランダム生成→アクセストークン/発行日に自動入力
 *   3. URLコピー: アドバイザーポケットURLをクリップボードにコピー
 * 
 * 使い方:
 *   1. kintone①アドバイザー名簿アプリ設定 → JavaScript/CSSでカスタマイズ
 *   2. このファイルをアップロードして適用
 *   3. 下の APP_BASE_URL を本番URLに合わせて書き換える
 */

(function() {
  'use strict';
  
  // ===== 設定 (本番運用時にここを書き換える) =====
  const APP_BASE_URL = 'https://zentsujishakyo-code.github.io/advisor-pocket/';
  
  // フィールドコード (必要に応じて変更)
  const FIELD_TOKEN = 'access_token';
  const FIELD_ISSUED = 'token_issued';
  
  // ===== トークン生成 =====
  function generateToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
    return token;
  }
  
  // ===== クリップボードにコピー =====
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // フォールバック (古いブラウザ用)
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return Promise.resolve();
  }
  
  // ===== ボタン生成 =====
  function createButton(label, onClick, color) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.type = 'button';
    btn.style.cssText = `
      margin: 4px 6px 4px 0;
      padding: 6px 14px;
      font-size: 13px;
      background: ${color || '#3B6D11'};
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    btn.addEventListener('click', onClick);
    return btn;
  }
  
  // ===== レコード詳細画面表示時 =====
  kintone.events.on(['app.record.detail.show'], function(event) {
    const record = event.record;
    const spaceEl = kintone.app.record.getHeaderMenuSpaceElement();
    if (!spaceEl) return event;
    
    // 既存のボタンがあれば削除 (重複防止)
    const existingContainer = document.getElementById('advisor-token-buttons');
    if (existingContainer) existingContainer.remove();
    
    // ボタンコンテナ
    const container = document.createElement('div');
    container.id = 'advisor-token-buttons';
    container.style.cssText = 'display: inline-block; margin-left: 12px;';
    
    // 「トークン発行」ボタン
    const issueBtn = createButton('🔑 トークン発行', function() {
      if (record[FIELD_TOKEN] && record[FIELD_TOKEN].value) {
        if (!confirm('既存のトークンがあります。新しいトークンに置き換えますか?\n(古いトークンは無効になります)')) {
          return;
        }
      }
      
      const newToken = generateToken();
      const today = new Date().toISOString().split('T')[0];
      const recordId = kintone.app.record.getId();
      
      // レコード更新APIで保存
      kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', {
        app: kintone.app.getId(),
        id: recordId,
        record: {
          [FIELD_TOKEN]: { value: newToken },
          [FIELD_ISSUED]: { value: today }
        }
      }).then(function() {
        alert('トークンを発行しました。\n画面を再読み込みしてください。');
        location.reload();
      }).catch(function(err) {
        alert('発行に失敗しました: ' + JSON.stringify(err));
      });
    }, '#3B6D11');
    
    // 「URLコピー」ボタン
    const copyBtn = createButton('📋 URLをコピー', function() {
      const token = record[FIELD_TOKEN] && record[FIELD_TOKEN].value;
      if (!token) {
        alert('トークンが未発行です。先に「トークン発行」をクリックしてください。');
        return;
      }
      const url = APP_BASE_URL + '?t=' + encodeURIComponent(token);
      copyToClipboard(url).then(function() {
        alert('URLをコピーしました。\nメールやLINEに貼り付けてアドバイザーに送ってください。\n\n' + url);
      }).catch(function() {
        prompt('コピーできませんでした。下のURLを手動でコピーしてください:', url);
      });
    }, '#5F5E5A');
    
    container.appendChild(issueBtn);
    container.appendChild(copyBtn);
    spaceEl.appendChild(container);
    
    return event;
  });
  
})();
