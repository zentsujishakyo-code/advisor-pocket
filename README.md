# アドバイザーポケット (Phase 1)

災害VCアドバイザー向けモバイルWebアプリ

## 概要

派遣中・登録済みのアドバイザーが、kintoneアカウントを持たずに
スマホブラウザから活動ログを投稿・閲覧できる仕組み。

- **フロントエンド**: GitHub Pages (HTML+JS+CSS)
- **バックエンド**: Google Apps Script (GAS)
- **データ本体**: kintone (管理ドメイン)
- **認証**: トークン方式 (kintoneアカウント不要)

## ファイル構成

```
advisor-pocket/
├── index.html
├── README.md
├── css/
│   └── style.css       (緑グレー基調)
├── js/
│   ├── config.js       (GAS URLを設定)
│   ├── api.js          (GAS呼び出し)
│   ├── app.js          (画面制御)
│   └── views/
│       ├── home.js
│       ├── post.js
│       ├── list.js
│       ├── detail.js   (活動ログ詳細・派遣先表示・返信機能)
│       ├── howto.js    (使い方ガイド画面)
│       └── profile.js  (プロフィール画面)
├── gas/
│   └── backend.js      (GASに貼り付ける)
└── kintone-customizer/
    └── advisor-token.js (kintone①名簿用: トークン発行・URLコピーボタン)
```

## セットアップ手順

### 1. kintone側の準備

①アドバイザー名簿アプリに以下のフィールドを追加。

| フィールド名 | フィールドコード | タイプ | 設定 |
|---|---|---|---|
| アクセストークン | access_token | 文字列(1行) | 重複禁止 |
| トークン発行日 | token_issued | 日付 | |

3アプリそれぞれで、APIトークン(read+write権限)を発行してメモ。

### 2. Google Apps Script の準備

1. 新規GASプロジェクトを作成
2. `gas/backend.js` の内容を貼り付け
3. プロジェクトの設定 → スクリプトプロパティで以下を登録:
   - `KINTONE_SUBDOMAIN` (例: kagawa-shakyo)
   - `KINTONE_APP_ID_ADVISORS` (①のアプリID)
   - `KINTONE_APP_ID_DISPATCH` (②のアプリID)
   - `KINTONE_APP_ID_LOGS` (③のアプリID)
   - `KINTONE_TOKEN_ADVISORS` (①のAPIトークン)
   - `KINTONE_TOKEN_DISPATCH` (②のAPIトークン)
   - `KINTONE_TOKEN_LOGS` (③のAPIトークン)
   - `ACCESS_LOG_SHEET_ID` (アクセスログ用のスプレッドシートID・任意)
4. デプロイ → ウェブアプリとしてデプロイ
   - 実行ユーザー: 自分
   - アクセス可能: 全員
5. 発行されたURLをメモ

### 3. GitHub Pages の準備

1. このリポジトリをGitHubにpush
2. Settings → Pages → Source: main / root を選択
3. `js/config.js` の `GAS_URL` に2でメモしたURLを貼る
4. URLを開いて動作確認

### 4. アドバイザー登録 (運用開始時)

1. GASエディタで `generateToken()` を実行 → ログにトークンが表示される
2. kintone①名簿で対象アドバイザーのレコードを開き
   - 「アクセストークン」フィールドにそのトークンを貼り付け
   - 「トークン発行日」に今日の日付
3. アドバイザーに以下のURLをLINE等で送付:
   `https://[github-pages-url]/?t=[トークン]`

## トラブルシューティング

### GAS URLが変わってしまった
デプロイ時に「新しいデプロイ」を作らず、「デプロイを管理 > 鉛筆アイコン > 新しいバージョン」で更新すること。新しいデプロイを作るとURLが変わって全アドバイザーがアクセス不能になる。

### スマホから投稿できない
- LocalStorageが無効になっていないか確認 (プライベートブラウズ等)
- 通信エラーの場合、GASのスクリプトプロパティが正しく設定されているか確認

### トークン無効と表示される
- ①名簿の対象レコードでアクセストークンが正しいか確認
- 「派遣可否ステータス」が「退会」になっていないか確認
