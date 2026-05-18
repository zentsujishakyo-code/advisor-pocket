/**
 * アドバイザーポケット - GAS バックエンド
 * 役割: スマホブラウザとkintoneの中継・認証・ログ記録
 * 
 * デプロイ方法:
 *   公開 → ウェブアプリとしてデプロイ
 *   実行ユーザー: 自分
 *   アクセス可能: 全員 (リンクを知っている全員)
 *   ※「新しいバージョン」ではなく「デプロイを管理」から更新すること
 */

// =========================================
// 設定 (スクリプトプロパティから読み込む推奨)
// =========================================
// kintone APIトークンなどの秘密情報は、コード内に直接書かず
// 「プロジェクトの設定 > スクリプトプロパティ」に保存する。
const PROPS = PropertiesService.getScriptProperties();
const CONFIG = {
  KINTONE_SUBDOMAIN: PROPS.getProperty('KINTONE_SUBDOMAIN'),
  KINTONE_APP_ID_ADVISORS: PROPS.getProperty('KINTONE_APP_ID_ADVISORS'),
  KINTONE_APP_ID_DISPATCH: PROPS.getProperty('KINTONE_APP_ID_DISPATCH'),
  KINTONE_APP_ID_LOGS: PROPS.getProperty('KINTONE_APP_ID_LOGS'),
  KINTONE_TOKEN_ADVISORS: PROPS.getProperty('KINTONE_TOKEN_ADVISORS'),
  KINTONE_TOKEN_DISPATCH: PROPS.getProperty('KINTONE_TOKEN_DISPATCH'),
  KINTONE_TOKEN_LOGS: PROPS.getProperty('KINTONE_TOKEN_LOGS'),
  ACCESS_LOG_SHEET_ID: PROPS.getProperty('ACCESS_LOG_SHEET_ID'),
};


// =========================================
// エントリポイント
// =========================================

// GET (読み込み系) - JSONP対応
function doGet(e) {
  const action = e.parameter.action;
  const token = e.parameter.token;
  const callback = e.parameter.callback; // JSONP用
  
  let result;
  try {
    // トークン検証
    const advisor = validateToken_(token);
    if (!advisor) {
      result = { error: 'invalid_token' };
    } else {
      // アクセスログ記録
      logAccess_(advisor.name.value, action);
      
      // アクション別ディスパッチ
      switch (action) {
        case 'getMyInfo':
          result = getMyInfo_(advisor);
          break;
        case 'getLogs':
          result = getLogs_(e.parameter);
          break;
        case 'getLogDetail':
          result = getLogDetail_(e.parameter.recordId);
          break;
        default:
          result = { error: 'unknown_action' };
      }
    }
  } catch (err) {
    result = { error: 'server_error', message: err.message };
  }
  
  // JSONPで返す (CORS問題回避)
  const json = JSON.stringify(result);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// POST (書き込み系) - text/plainで受ける (preflightを回避)
function doPost(e) {
  let result;
  try {
    const params = JSON.parse(e.postData.contents);
    const advisor = validateToken_(params.token);
    if (!advisor) {
      result = { error: 'invalid_token' };
    } else {
      logAccess_(advisor.name.value, params.action);
      
      switch (params.action) {
        case 'postLog':
          result = postLog_(advisor, params.data);
          break;
        default:
          result = { error: 'unknown_action' };
      }
    }
  } catch (err) {
    result = { error: 'server_error', message: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}


// =========================================
// 認証 - トークン検証
// =========================================
function validateToken_(token) {
  if (!token || token.length !== 32) return null;
  
  const url = `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/records.json`
    + `?app=${CONFIG.KINTONE_APP_ID_ADVISORS}`
    + `&query=${encodeURIComponent('access_token = "' + token + '"')}`;
  
  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_ADVISORS },
    muteHttpExceptions: true
  });
  
  if (res.getResponseCode() !== 200) return null;
  const records = JSON.parse(res.getContentText()).records;
  if (records.length === 0) return null;
  
  // 退会者はアクセス不可
  if (records[0].status.value === '退会') return null;
  
  return records[0];
}


// =========================================
// 本人情報 + 派遣中案件
// =========================================
function getMyInfo_(advisor) {
  const result = {
    advisor: {
      recordId: advisor.$id.value,
      name: advisor.name.value,
      affiliation: advisor.affiliation.value,
      position: advisor.position ? advisor.position.value : '',
      skills: advisor.skills_0 ? advisor.skills_0.value : [],
      status: advisor.status.value,
      tel: advisor.tel_mobile.value,
      email: advisor.email.value,
      availableArea: advisor.available_area ? advisor.available_area.value : [],
    },
    currentDispatch: null
  };
  
  // 派遣中ステータスなら、②派遣管理から該当案件を取得
  if (advisor.status.value === '派遣中') {
    const dispatch = findCurrentDispatch_(advisor.name.value);
    if (dispatch) {
      result.currentDispatch = {
        recordId: dispatch.$id.value,
        disasterName: dispatch.disaster_name.value,
        dispatchTo: dispatch.dispatch_to.value,
        disasterDate: dispatch.disaster_date.value,
        vcOpenDate: dispatch.vc_open_date ? dispatch.vc_open_date.value : '',
        siteSummary: dispatch.site_summary ? dispatch.site_summary.value : '',
        handoverNotes: dispatch.handover_notes ? dispatch.handover_notes.value : '',
        siteContact: dispatch.site_contact ? dispatch.site_contact.value : '',
        status: dispatch.status.value,
      };
    }
  }
  return result;
}

function findCurrentDispatch_(advisorName) {
  // ②派遣管理のサブテーブル「担当アドバイザー」にこの名前が含まれ
  // かつステータスが「派遣中」のものを探す
  const url = `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/records.json`
    + `?app=${CONFIG.KINTONE_APP_ID_DISPATCH}`
    + `&query=${encodeURIComponent('status in ("派遣中") order by disaster_date desc limit 20')}`;
  
  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_DISPATCH },
    muteHttpExceptions: true
  });
  
  if (res.getResponseCode() !== 200) return null;
  const records = JSON.parse(res.getContentText()).records;
  
  // サブテーブル内に該当アドバイザーがいるレコードを探す
  for (const rec of records) {
    if (!rec.advisers_table) continue;
    const found = rec.advisers_table.value.some(row => 
      row.value.adv_name && row.value.adv_name.value === advisorName
    );
    if (found) return rec;
  }
  return null;
}


// =========================================
// 活動ログ取得
// =========================================
function getLogs_(params) {
  const category = params.category || '';
  const limit = parseInt(params.limit || '20', 10);
  const offset = parseInt(params.offset || '0', 10);
  
  let query = '';
  if (category && category !== 'all') {
    query = `category in ("${category}") `;
  }
  query += `order by 日付 desc limit ${limit} offset ${offset}`;
  
  const url = `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/records.json`
    + `?app=${CONFIG.KINTONE_APP_ID_LOGS}`
    + `&query=${encodeURIComponent(query)}`;
  
  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_LOGS },
    muteHttpExceptions: true
  });
  
  if (res.getResponseCode() !== 200) {
    return { error: 'kintone_error', code: res.getResponseCode() };
  }
  
  const records = JSON.parse(res.getContentText()).records;
  return {
    logs: records.map(r => ({
      recordId: r.$id.value,
      postedDate: r['日付'].value,
      category: r.category.value,
      phase: r['ドロップダウン_0'] ? r['ドロップダウン_0'].value : '',
      title: r['文字列__1行_'] ? r['文字列__1行_'].value : '',
      tags: r['文字列__1行__0'] ? r['文字列__1行__0'].value : '',
      content: r['文字列__複数行_'] ? r['文字列__複数行_'].value : '',
      authorName: r.author_ref ? r.author_ref.value : '',
      authorAffiliation: r.author_affiliation ? r.author_affiliation.value : '',
      disasterName: r.disaster_name ? r.disaster_name.value : '',
    }))
  };
}


// =========================================
// ログ詳細
// =========================================
function getLogDetail_(recordId) {
  if (!recordId) return { error: 'no_record_id' };
  
  const url = `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/record.json`
    + `?app=${CONFIG.KINTONE_APP_ID_LOGS}&id=${recordId}`;
  
  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_LOGS },
    muteHttpExceptions: true
  });
  
  if (res.getResponseCode() !== 200) {
    return { error: 'kintone_error' };
  }
  
  const r = JSON.parse(res.getContentText()).record;
  return {
    log: {
      recordId: r.$id.value,
      postedDate: r['日付'].value,
      category: r.category.value,
      phase: r['ドロップダウン_0'] ? r['ドロップダウン_0'].value : '',
      title: r['文字列__1行_'] ? r['文字列__1行_'].value : '',
      tags: r['文字列__1行__0'] ? r['文字列__1行__0'].value : '',
      content: r['文字列__複数行_'] ? r['文字列__複数行_'].value : '',
      authorName: r.author_ref ? r.author_ref.value : '',
      authorAffiliation: r.author_affiliation ? r.author_affiliation.value : '',
      disasterName: r.disaster_name ? r.disaster_name.value : '',
      dispatchTo: r.dispatch_to_copy ? r.dispatch_to_copy.value : '',
    }
  };
}


// =========================================
// 活動ログ投稿
// =========================================
function postLog_(advisor, data) {
  // 必須項目チェック
  if (!data.title || !data.content || !data.category) {
    return { error: 'missing_required_fields' };
  }
  
  // 投稿者情報は本人情報から自動セット (改ざん防止)
  const record = {
    'author_ref': { value: advisor.name.value },
    'author_affiliation': { value: advisor.affiliation.value },
    '日付': { value: new Date().toISOString().split('T')[0] },
    'category': { value: data.category },
    '文字列__1行_': { value: data.title },
    '文字列__複数行_': { value: data.content },
  };
  
  if (data.phase) record['ドロップダウン_0'] = { value: data.phase };
  if (data.tags) record['文字列__1行__0'] = { value: data.tags };
  
  // 派遣中なら案件情報も自動付与
  if (advisor.status.value === '派遣中') {
    const dispatch = findCurrentDispatch_(advisor.name.value);
    if (dispatch) {
      record.disaster_name = { value: dispatch.disaster_name.value };
      record.dispatch_to_copy = { value: dispatch.dispatch_to.value };
    }
  }
  
  const payload = {
    app: parseInt(CONFIG.KINTONE_APP_ID_LOGS, 10),
    record: record
  };
  
  const res = UrlFetchApp.fetch(
    `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/record.json`, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_LOGS },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }
  );
  
  if (res.getResponseCode() !== 200) {
    return { error: 'kintone_error', detail: res.getContentText() };
  }
  
  return { success: true, recordId: JSON.parse(res.getContentText()).id };
}


// =========================================
// アクセスログ (Googleスプレッドシートに記録)
// =========================================
function logAccess_(advisorName, action) {
  if (!CONFIG.ACCESS_LOG_SHEET_ID) return;
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.ACCESS_LOG_SHEET_ID).getActiveSheet();
    sheet.appendRow([new Date(), advisorName, action]);
  } catch (e) {
    // ログ記録失敗は致命的でないので握りつぶす
  }
}


// =========================================
// トークン生成ユーティリティ (管理画面から手動実行)
// =========================================
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  Logger.log('生成されたトークン: ' + token);
  Logger.log('発行URL: https://[github-pages-url]/?t=' + token);
  return token;
}
