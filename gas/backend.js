/**
 * アドバイザーポケット - GAS バックエンド (複数派遣対応)
 *
 * セキュリティ修正メモ (この版で対応):
 *   - トークン検証を「英数字32文字」の厳密チェックに変更 (クエリ注入対策)
 *   - レコードID を整数として検証してから使用 (削除等のパラメータ注入対策)
 *   - JSONP callback 名を英数字/アンダースコアに制限
 *   - トークン生成を Utilities.getUuid() ベースに変更 (安全な乱数)
 */

const PROPS = PropertiesService.getScriptProperties();
const CONFIG = {
  KINTONE_SUBDOMAIN: PROPS.getProperty('KINTONE_SUBDOMAIN'),
  KINTONE_APP_ID_ADVISORS: PROPS.getProperty('KINTONE_APP_ID_ADVISORS'),
  KINTONE_APP_ID_DISPATCH: PROPS.getProperty('KINTONE_APP_ID_DISPATCH'),
  KINTONE_APP_ID_LOGS: PROPS.getProperty('KINTONE_APP_ID_LOGS'),
  KINTONE_APP_ID_COMMENTS: PROPS.getProperty('KINTONE_APP_ID_COMMENTS'),
  KINTONE_TOKEN_ADVISORS: PROPS.getProperty('KINTONE_TOKEN_ADVISORS'),
  KINTONE_TOKEN_DISPATCH: PROPS.getProperty('KINTONE_TOKEN_DISPATCH'),
  KINTONE_TOKEN_LOGS: PROPS.getProperty('KINTONE_TOKEN_LOGS'),
  KINTONE_TOKEN_COMMENTS: PROPS.getProperty('KINTONE_TOKEN_COMMENTS'),
  ACCESS_LOG_SHEET_ID: PROPS.getProperty('ACCESS_LOG_SHEET_ID'),
};


// =========================================
// 共通ユーティリティ (入力検証・エスケープ)
// =========================================

// kintoneのクエリ文字列に安全に埋め込むためのエスケープ
function escapeKintoneString_(s) {
  if (!s) return '';
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// レコードIDを正の整数として検証。不正なら null を返す。
// URLパラメータへの注入 (例: "1&ids[1]=999") を防ぐ。
function toRecordId_(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!/^[1-9][0-9]*$/.test(s)) return null;
  return parseInt(s, 10);
}


// =========================================
// エントリポイント
// =========================================

function doGet(e) {
  const action = e.parameter.action;
  const token = e.parameter.token;

  // JSONP callback 名は英数字とアンダースコアのみ許可 (不正な値は無視)
  let callback = e.parameter.callback;
  if (callback && !/^[A-Za-z0-9_]+$/.test(callback)) {
    callback = null;
  }

  if (action === 'getFile') {
    return handleGetFile_(token, e.parameter.fileKey);
  }

  let result;
  try {
    const advisor = validateToken_(token);
    if (!advisor) {
      result = { error: 'invalid_token' };
    } else {
      logAccess_(advisor.name.value, action);

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
        case 'getFilterOptions':
          result = getFilterOptions_();
          break;
        case 'getComments':
          result = getComments_(e.parameter.recordId);
          break;
        case 'getMyLogsCommentCounts':
          result = getMyLogsCommentCounts_(advisor);
          break;
        default:
          result = { error: 'unknown_action' };
      }
    }
  } catch (err) {
    result = { error: 'server_error', message: err.message };
  }

  const json = JSON.stringify(result);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

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
        case 'updateLog':
          result = updateLog_(advisor, params.data);
          break;
        case 'deleteLog':
          result = deleteLog_(advisor, params.data);
          break;
        case 'updateProfile':
          result = updateProfile_(advisor, params.data);
          break;
        case 'postComment':
          result = postComment_(advisor, params.data);
          break;
        case 'updateComment':
          result = updateComment_(advisor, params.data);
          break;
        case 'deleteComment':
          result = deleteComment_(advisor, params.data);
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
// 認証
// =========================================
function validateToken_(token) {
  // 長さだけでなく文字種も検証し、クエリ注入を防ぐ (生成トークンは英数字のみ)
  if (!token || !/^[A-Za-z0-9]{32}$/.test(token)) return null;

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
  if (records[0].status.value === '退会') return null;

  return records[0];
}


// =========================================
// 添付ファイル取得
// =========================================
function handleGetFile_(token, fileKey) {
  const advisor = validateToken_(token);
  if (!advisor) {
    return ContentService.createTextOutput('Unauthorized')
      .setMimeType(ContentService.MimeType.TEXT);
  }

  if (!fileKey) {
    return ContentService.createTextOutput('No fileKey')
      .setMimeType(ContentService.MimeType.TEXT);
  }

  const url = `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/file.json?fileKey=${encodeURIComponent(fileKey)}`;
  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_LOGS },
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    return ContentService.createTextOutput('File not found')
      .setMimeType(ContentService.MimeType.TEXT);
  }

  const blob = res.getBlob();
  return ContentService.createTextOutput(Utilities.base64Encode(blob.getBytes()))
    .setMimeType(ContentService.MimeType.TEXT);
}


// =========================================
// 本人情報 + 派遣中案件 (複数対応)
// =========================================
function getMyInfo_(advisor) {
  const result = {
    advisor: {
      recordId: advisor.$id.value,
      name: advisor.name.value,
      affiliation: advisor.affiliation.value,
      status: advisor.status.value,
      tel: advisor.tel_mobile ? advisor.tel_mobile.value : '',
      email: advisor.email ? advisor.email.value : '',
    },
    currentDispatches: []  // 配列に変更
  };

  if (advisor.status.value === '派遣中') {
    result.currentDispatches = findCurrentDispatches_(advisor.name.value);
  }
  return result;
}

/**
 * 派遣中のレコードのうち、サブテーブルに該当アドバイザーがいるものを全件返す
 */
function findCurrentDispatches_(advisorName) {
  const url = `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/records.json`
    + `?app=${CONFIG.KINTONE_APP_ID_DISPATCH}`
    + `&query=${encodeURIComponent('status in ("派遣中") order by disaster_date desc limit 50')}`;

  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_DISPATCH },
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) return [];
  const records = JSON.parse(res.getContentText()).records;

  const matches = [];
  for (const rec of records) {
    if (!rec.advisers_table) continue;
    const found = rec.advisers_table.value.some(row =>
      row.value.adv_name && row.value.adv_name.value === advisorName
    );
    if (found) {
      matches.push({
        recordId: rec.$id.value,
        disasterName: rec.disaster_name ? rec.disaster_name.value : '',
        dispatchTo: rec.dispatch_to ? rec.dispatch_to.value : '',
        status: rec.status ? rec.status.value : '',
      });
    }
  }
  return matches;
}


// =========================================
// 絞り込み選択肢
// =========================================
function getFilterOptions_() {
  const result = { advisors: [], disasters: [] };

  try {
    const url = `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/records.json`
      + `?app=${CONFIG.KINTONE_APP_ID_ADVISORS}`
      + `&query=${encodeURIComponent('status not in ("退会") order by name asc limit 200')}`;
    const res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_ADVISORS },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 200) {
      const records = JSON.parse(res.getContentText()).records;
      result.advisors = records.map(r => r.name.value);
    }
  } catch (e) {}

  try {
    const url = `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/records.json`
      + `?app=${CONFIG.KINTONE_APP_ID_DISPATCH}`
      + `&query=${encodeURIComponent('order by disaster_date desc limit 100')}`;
    const res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_DISPATCH },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 200) {
      const records = JSON.parse(res.getContentText()).records;
      result.disasters = records.map(r => r.disaster_name.value);
    }
  } catch (e) {}

  return result;
}


// =========================================
// 活動ログ取得
// =========================================
function getLogs_(params) {
  const category = params.category || '';
  const phase = params.phase || '';
  const disaster = params.disaster || '';
  const author = params.author || '';
  const keyword = params.keyword || '';
  const sortOrder = params.sortOrder || 'desc';
  const limit = parseInt(params.limit || '30', 10);
  const offset = parseInt(params.offset || '0', 10);

  const conditions = [];
  if (category && category !== 'all') {
    conditions.push(`category in ("${escapeKintoneString_(category)}")`);
  }
  if (phase && phase !== 'all') {
    conditions.push(`phase in ("${escapeKintoneString_(phase)}")`);
  }
  if (disaster && disaster !== 'all') {
    conditions.push(`disaster_name = "${escapeKintoneString_(disaster)}"`);
  }
  if (author && author !== 'all') {
    conditions.push(`author_ref = "${escapeKintoneString_(author)}"`);
  }
  if (keyword) {
    const k = escapeKintoneString_(keyword);
    conditions.push(`(title like "${k}" or content like "${k}" or tags like "${k}")`);
  }

  let query = conditions.join(' and ');
  if (query) query += ' ';
  query += `order by posted_date ${sortOrder === 'asc' ? 'asc' : 'desc'} limit ${limit} offset ${offset}`;

  const url = `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/records.json`
    + `?app=${CONFIG.KINTONE_APP_ID_LOGS}`
    + `&query=${encodeURIComponent(query)}`;

  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_LOGS },
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    return { error: 'kintone_error', code: res.getResponseCode(), detail: res.getContentText() };
  }

  const records = JSON.parse(res.getContentText()).records;
  return {
    logs: records.map(r => ({
      recordId: r.$id.value,
      postedDate: r.posted_date ? r.posted_date.value : '',
      category: r.category ? r.category.value : '',
      phase: r.phase ? r.phase.value : '',
      title: r.title ? r.title.value : '',
      tags: r.tags ? r.tags.value : '',
      content: r.content ? r.content.value : '',
      remarks: r.remarks ? r.remarks.value : '',
      authorName: r.author_ref ? r.author_ref.value : '',
      authorAffiliation: r.author_affiliation ? r.author_affiliation.value : '',
      disasterName: r.disaster_name ? r.disaster_name.value : '',
      dispatchTo: r.dispatch_to_copy ? r.dispatch_to_copy.value : '',
      attachments: r.attachments ? r.attachments.value : [],
    }))
  };
}


// =========================================
// ログ詳細
// =========================================
function getLogDetail_(recordId) {
  const id = toRecordId_(recordId);
  if (!id) return { error: 'no_record_id' };

  const url = `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/record.json`
    + `?app=${CONFIG.KINTONE_APP_ID_LOGS}&id=${id}`;

  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_LOGS },
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) return { error: 'kintone_error' };

  const r = JSON.parse(res.getContentText()).record;
  return {
    log: {
      recordId: r.$id.value,
      postedDate: r.posted_date ? r.posted_date.value : '',
      category: r.category ? r.category.value : '',
      phase: r.phase ? r.phase.value : '',
      title: r.title ? r.title.value : '',
      tags: r.tags ? r.tags.value : '',
      content: r.content ? r.content.value : '',
      remarks: r.remarks ? r.remarks.value : '',
      authorName: r.author_ref ? r.author_ref.value : '',
      authorAffiliation: r.author_affiliation ? r.author_affiliation.value : '',
      disasterName: r.disaster_name ? r.disaster_name.value : '',
      dispatchTo: r.dispatch_to_copy ? r.dispatch_to_copy.value : '',
      attachments: r.attachments ? r.attachments.value : [],
    }
  };
}


// =========================================
// コメント機能
// =========================================
function getComments_(logRecordId) {
  const id = toRecordId_(logRecordId);
  if (!id) return { error: 'no_record_id' };
  if (!CONFIG.KINTONE_APP_ID_COMMENTS) return { comments: [] };

  const query = `log_record_id = "${id}" order by posted_at asc limit 100`;
  const url = `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/records.json`
    + `?app=${CONFIG.KINTONE_APP_ID_COMMENTS}`
    + `&query=${encodeURIComponent(query)}`;

  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_COMMENTS },
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    return { error: 'kintone_error', detail: res.getContentText() };
  }

  const records = JSON.parse(res.getContentText()).records;
  return {
    comments: records.map(r => ({
      recordId: r.$id.value,
      logRecordId: r.log_record_id.value,
      authorName: r.author_name ? r.author_name.value : '',
      authorAffiliation: r.author_affiliation ? r.author_affiliation.value : '',
      body: r.comment_body ? r.comment_body.value : '',
      postedAt: r.posted_at ? r.posted_at.value : '',
    }))
  };
}

function getMyLogsCommentCounts_(advisor) {
  if (!CONFIG.KINTONE_APP_ID_COMMENTS) return { items: [] };

  const myName = advisor.name.value;
  const logsQuery = `author_ref = "${escapeKintoneString_(myName)}" order by $id desc limit 100`;
  const logsUrl = `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/records.json`
    + `?app=${CONFIG.KINTONE_APP_ID_LOGS}`
    + `&query=${encodeURIComponent(logsQuery)}`
    + `&fields[0]=$id&fields[1]=title`;

  const logsRes = UrlFetchApp.fetch(logsUrl, {
    method: 'get',
    headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_LOGS },
    muteHttpExceptions: true
  });

  if (logsRes.getResponseCode() !== 200) {
    return { error: 'kintone_error', detail: logsRes.getContentText() };
  }

  const myLogs = JSON.parse(logsRes.getContentText()).records;
  if (myLogs.length === 0) return { items: [] };

  const logIds = myLogs.map(r => '"' + r.$id.value + '"').join(',');
  const commentsQuery = `log_record_id in (${logIds}) order by posted_at desc limit 500`;
  const commentsUrl = `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/records.json`
    + `?app=${CONFIG.KINTONE_APP_ID_COMMENTS}`
    + `&query=${encodeURIComponent(commentsQuery)}`
    + `&fields[0]=log_record_id&fields[1]=author_name&fields[2]=posted_at`;

  const commentsRes = UrlFetchApp.fetch(commentsUrl, {
    method: 'get',
    headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_COMMENTS },
    muteHttpExceptions: true
  });

  if (commentsRes.getResponseCode() !== 200) {
    return { error: 'kintone_error', detail: commentsRes.getContentText() };
  }

  const allComments = JSON.parse(commentsRes.getContentText()).records;
  const othersComments = allComments.filter(c => c.author_name.value !== myName);

  const countMap = {};
  othersComments.forEach(c => {
    const lid = c.log_record_id.value;
    if (!countMap[lid]) {
      countMap[lid] = { count: 0, latestAt: '' };
    }
    countMap[lid].count++;
    if (c.posted_at.value > countMap[lid].latestAt) {
      countMap[lid].latestAt = c.posted_at.value;
    }
  });

  const items = myLogs.map(r => ({
    logRecordId: r.$id.value,
    title: r.title ? r.title.value : '',
    commentCount: countMap[r.$id.value] ? countMap[r.$id.value].count : 0,
    latestCommentAt: countMap[r.$id.value] ? countMap[r.$id.value].latestAt : ''
  }));

  return { items: items };
}

function postComment_(advisor, data) {
  if (!data.logRecordId) return { error: 'no_log_record_id' };
  if (!data.body || !data.body.trim()) return { error: 'empty_body' };

  const logId = toRecordId_(data.logRecordId);
  if (!logId) return { error: 'invalid_log_record_id' };

  const record = {
    'log_record_id': { value: String(logId) },
    'author_name': { value: advisor.name.value },
    'author_affiliation': { value: advisor.affiliation.value },
    'comment_body': { value: data.body.trim() },
    'posted_at': { value: new Date().toISOString() },
  };

  const payload = {
    app: parseInt(CONFIG.KINTONE_APP_ID_COMMENTS, 10),
    record: record
  };

  const res = UrlFetchApp.fetch(
    `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/record.json`, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_COMMENTS },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }
  );

  if (res.getResponseCode() !== 200) {
    return { error: 'kintone_error', detail: res.getContentText() };
  }

  return { success: true, recordId: JSON.parse(res.getContentText()).id };
}

function updateComment_(advisor, data) {
  const id = toRecordId_(data.recordId);
  if (!id) return { error: 'no_record_id' };
  if (!data.body || !data.body.trim()) return { error: 'empty_body' };

  const detailUrl = `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/record.json`
    + `?app=${CONFIG.KINTONE_APP_ID_COMMENTS}&id=${id}`;
  const detailRes = UrlFetchApp.fetch(detailUrl, {
    method: 'get',
    headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_COMMENTS },
    muteHttpExceptions: true
  });
  if (detailRes.getResponseCode() !== 200) return { error: 'record_not_found' };
  const existing = JSON.parse(detailRes.getContentText()).record;
  if (!existing.author_name || existing.author_name.value !== advisor.name.value) {
    return { error: 'not_owner' };
  }

  const payload = {
    app: parseInt(CONFIG.KINTONE_APP_ID_COMMENTS, 10),
    id: id,
    record: { 'comment_body': { value: data.body.trim() } }
  };

  const res = UrlFetchApp.fetch(
    `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/record.json`, {
      method: 'put',
      contentType: 'application/json',
      headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_COMMENTS },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }
  );

  if (res.getResponseCode() !== 200) {
    return { error: 'kintone_error', detail: res.getContentText() };
  }

  return { success: true };
}

function deleteComment_(advisor, data) {
  const id = toRecordId_(data.recordId);
  if (!id) return { error: 'no_record_id' };

  const detailUrl = `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/record.json`
    + `?app=${CONFIG.KINTONE_APP_ID_COMMENTS}&id=${id}`;
  const detailRes = UrlFetchApp.fetch(detailUrl, {
    method: 'get',
    headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_COMMENTS },
    muteHttpExceptions: true
  });
  if (detailRes.getResponseCode() !== 200) return { error: 'record_not_found' };
  const existing = JSON.parse(detailRes.getContentText()).record;
  if (!existing.author_name || existing.author_name.value !== advisor.name.value) {
    return { error: 'not_owner' };
  }

  const url = `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/records.json`
    + `?app=${CONFIG.KINTONE_APP_ID_COMMENTS}&ids[0]=${id}`;

  const res = UrlFetchApp.fetch(url, {
    method: 'delete',
    headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_COMMENTS },
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    return { error: 'kintone_error', detail: res.getContentText() };
  }

  return { success: true };
}


// =========================================
// ファイルアップロード
// =========================================
function uploadFile_(base64Data, fileName, mimeType) {
  const decoded = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(decoded, mimeType, fileName);

  const payload = { 'file': blob };

  const res = UrlFetchApp.fetch(
    `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/file.json`, {
      method: 'post',
      headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_LOGS },
      payload: payload,
      muteHttpExceptions: true
    }
  );

  if (res.getResponseCode() !== 200) {
    Logger.log('ファイルアップロード失敗: ' + res.getContentText());
    return null;
  }

  return JSON.parse(res.getContentText()).fileKey;
}


// =========================================
// 投稿日時の整形
// =========================================
function formatPostedDate_(input) {
  if (input) {
    const d = new Date(input);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }
  return new Date().toISOString();
}


// =========================================
// 活動ログ投稿 (派遣先対応)
// =========================================
function postLog_(advisor, data) {
  if (!data.title || !data.content || !data.category) {
    return { error: 'missing_required_fields' };
  }

  const record = {
    'author_ref': { value: advisor.name.value },
    'category': { value: data.category },
    'title': { value: data.title },
    'content': { value: data.content },
    'posted_date': { value: formatPostedDate_(data.postedDate) },
  };

  if (data.phase) record['phase'] = { value: data.phase };
  if (data.tags) record['tags'] = { value: data.tags };
  if (data.remarks) record['remarks'] = { value: data.remarks };

  // 派遣案件情報を保存
  // フロントから data.disasterName / data.dispatchTo が渡される場合はそれを使用
  // 渡されない場合は派遣中アドバイザーの最初の案件を自動付与
  if (data.disasterName) {
    record['disaster_name'] = { value: data.disasterName };
  }
  if (data.dispatchTo) {
    record['dispatch_to_copy'] = { value: data.dispatchTo };
  }

  // フロントから値が来ない場合のフォールバック (派遣中で1件のみのアドバイザー想定)
  if (!data.disasterName && advisor.status.value === '派遣中') {
    const dispatches = findCurrentDispatches_(advisor.name.value);
    if (dispatches.length === 1) {
      record['disaster_name'] = { value: dispatches[0].disasterName };
      record['dispatch_to_copy'] = { value: dispatches[0].dispatchTo };
    }
  }

  if (data.attachments && Array.isArray(data.attachments) && data.attachments.length > 0) {
    const fileKeys = [];
    for (let i = 0; i < data.attachments.length; i++) {
      const att = data.attachments[i];
      const fileName = att.fileName || ('file_' + (i + 1));

      const fileKey = uploadFile_(att.data, fileName, att.mimeType);
      if (fileKey) {
        fileKeys.push({ fileKey: fileKey });
      }
    }
    if (fileKeys.length > 0) {
      record['attachments'] = { value: fileKeys };
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
      headers: {
        'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_LOGS + ',' + CONFIG.KINTONE_TOKEN_ADVISORS + ',' + CONFIG.KINTONE_TOKEN_DISPATCH
      },
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
// 活動ログ編集
// =========================================
function updateLog_(advisor, data) {
  const id = toRecordId_(data.recordId);
  if (!id) return { error: 'no_record_id' };
  if (!data.title || !data.content || !data.category) {
    return { error: 'missing_required_fields' };
  }

  const detailUrl = `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/record.json`
    + `?app=${CONFIG.KINTONE_APP_ID_LOGS}&id=${id}`;
  const detailRes = UrlFetchApp.fetch(detailUrl, {
    method: 'get',
    headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_LOGS },
    muteHttpExceptions: true
  });
  if (detailRes.getResponseCode() !== 200) return { error: 'record_not_found' };
  const existing = JSON.parse(detailRes.getContentText()).record;
  if (!existing.author_ref || existing.author_ref.value !== advisor.name.value) {
    return { error: 'not_owner' };
  }

  const record = {
    'category': { value: data.category },
    'title': { value: data.title },
    'content': { value: data.content },
    'phase': { value: data.phase || '' },
    'tags': { value: data.tags || '' },
    'remarks': { value: data.remarks || '' },
  };

  if (data.postedDate) {
    record['posted_date'] = { value: formatPostedDate_(data.postedDate) };
  }

  // 編集時も派遣先情報を保存
  if (data.disasterName !== undefined) {
    record['disaster_name'] = { value: data.disasterName || '' };
  }
  if (data.dispatchTo !== undefined) {
    record['dispatch_to_copy'] = { value: data.dispatchTo || '' };
  }

  const existingKeys = (data.existingAttachments || []).map(k => ({ fileKey: k }));
  const newKeys = [];

  if (data.newAttachments && Array.isArray(data.newAttachments) && data.newAttachments.length > 0) {
    for (let i = 0; i < data.newAttachments.length; i++) {
      const att = data.newAttachments[i];
      const fileName = att.fileName || ('file_edit_' + (i + 1));

      const fileKey = uploadFile_(att.data, fileName, att.mimeType);
      if (fileKey) {
        newKeys.push({ fileKey: fileKey });
      }
    }
  }

  record['attachments'] = { value: existingKeys.concat(newKeys) };

  const payload = {
    app: parseInt(CONFIG.KINTONE_APP_ID_LOGS, 10),
    id: id,
    record: record
  };

  const res = UrlFetchApp.fetch(
    `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/record.json`, {
      method: 'put',
      contentType: 'application/json',
      headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_LOGS },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }
  );

  if (res.getResponseCode() !== 200) {
    return { error: 'kintone_error', detail: res.getContentText() };
  }

  return { success: true };
}


// =========================================
// 活動ログ削除
// =========================================
function deleteLog_(advisor, data) {
  const id = toRecordId_(data.recordId);
  if (!id) return { error: 'no_record_id' };

  const detailUrl = `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/record.json`
    + `?app=${CONFIG.KINTONE_APP_ID_LOGS}&id=${id}`;
  const detailRes = UrlFetchApp.fetch(detailUrl, {
    method: 'get',
    headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_LOGS },
    muteHttpExceptions: true
  });
  if (detailRes.getResponseCode() !== 200) return { error: 'record_not_found' };
  const existing = JSON.parse(detailRes.getContentText()).record;
  if (!existing.author_ref || existing.author_ref.value !== advisor.name.value) {
    return { error: 'not_owner' };
  }

  const url = `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/records.json`
    + `?app=${CONFIG.KINTONE_APP_ID_LOGS}&ids[0]=${id}`;

  const res = UrlFetchApp.fetch(url, {
    method: 'delete',
    headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_LOGS },
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    return { error: 'kintone_error', detail: res.getContentText() };
  }

  return { success: true };
}


// =========================================
// プロフィール更新
// =========================================
function updateProfile_(advisor, data) {
  const updateRecord = {};

  if (data.tel !== undefined) {
    updateRecord['tel_mobile'] = { value: data.tel };
  }
  if (data.email !== undefined) {
    updateRecord['email'] = { value: data.email };
  }
  if (data.status !== undefined) {
    const allowedStatuses = ['登録中', '派遣中', '派遣不可(一時)', '派遣不可(長期)'];
    if (allowedStatuses.indexOf(data.status) === -1) {
      return { error: 'invalid_status' };
    }
    updateRecord['status'] = { value: data.status };
  }

  if (Object.keys(updateRecord).length === 0) {
    return { error: 'no_update_fields' };
  }

  const payload = {
    app: parseInt(CONFIG.KINTONE_APP_ID_ADVISORS, 10),
    id: parseInt(advisor.$id.value, 10),
    record: updateRecord
  };

  const res = UrlFetchApp.fetch(
    `https://${CONFIG.KINTONE_SUBDOMAIN}.cybozu.com/k/v1/record.json`, {
      method: 'put',
      contentType: 'application/json',
      headers: { 'X-Cybozu-API-Token': CONFIG.KINTONE_TOKEN_ADVISORS },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }
  );

  if (res.getResponseCode() !== 200) {
    return { error: 'kintone_error', detail: res.getContentText() };
  }

  return { success: true };
}


// =========================================
// アクセスログ
// =========================================
function logAccess_(advisorName, action) {
  if (!CONFIG.ACCESS_LOG_SHEET_ID) return;
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.ACCESS_LOG_SHEET_ID).getActiveSheet();
    sheet.appendRow([new Date(), advisorName, action]);
  } catch (e) {
  }
}


// =========================================
// ウォームアップ
// =========================================
function warmup() {
  Logger.log('warmup at ' + new Date().toISOString());
  return 'ok';
}


// =========================================
// トークン生成 (管理画面から手動実行)
// 安全な乱数 (Utilities.getUuid) を使い、英数字32文字を生成する
// =========================================
function generateToken() {
  const raw = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  const token = raw.substring(0, 32); // 32桁の16進 (英数字なので検証を通過する)
  Logger.log('生成されたトークン: ' + token);
  Logger.log('長さ: ' + token.length);
  return token;
}
