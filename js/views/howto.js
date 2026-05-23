// =========================================
// 使い方ガイド画面
// =========================================
Views.howto = {
  render(container, appState) {
    container.innerHTML = `
      <div class="form-section">
        <div style="background: var(--color-primary-light); padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
          <div style="font-size: 15px; font-weight: 600; color: var(--color-primary-dark); margin-bottom: 6px;">
            📖 アドバイザーポケットの使い方
          </div>
          <div style="font-size: 13px; color: var(--color-text-muted); line-height: 1.7;">
            災害現場で得た知見を、組織として蓄積するためのアプリです。
            スマートフォンから簡単に活動を記録できます。
          </div>
        </div>
        
        ${this.section('✏️ 活動ログを書く', `
          <ol style="margin: 0; padding-left: 22px; line-height: 1.9;">
            <li>「活動ログを書く」をタップ</li>
            <li>種別を選ぶ (日報、Tips、失敗談、Q&A、資料共有)</li>
            <li>タイトル、内容、タグを入力</li>
            <li>必要に応じて写真やPDFを添付(最大3個)</li>
            <li>「送信する」をタップ</li>
          </ol>
          <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 8px; padding-top: 8px; border-top: 0.5px dashed var(--color-border);">
            派遣中の場合、災害名は自動で付与されます。
          </div>
        `)}
        
        ${this.section('📋 活動ログを見る', `
          <ul style="margin: 0; padding-left: 22px; line-height: 1.9;">
            <li>一覧から気になる投稿をタップで詳細表示</li>
            <li>検索ボックスでキーワード検索 (タイトル・内容・タグ)</li>
            <li>「絞り込み・並び替え」で種別、フェーズ、災害名、投稿者で絞り込み</li>
            <li>50件を超える場合は「さらに読み込む」で追加表示</li>
          </ul>
        `)}
        
        ${this.section('💬 コメント', `
          <ul style="margin: 0; padding-left: 22px; line-height: 1.9;">
            <li>詳細画面の下部にコメントを書ける</li>
            <li>自分の投稿にコメントが付くと、ホーム画面に赤バッジが出る</li>
            <li>自分が書いたコメントは編集・削除可能</li>
          </ul>
        `)}
        
        ${this.section('📷 写真・添付ファイル', `
          <ul style="margin: 0; padding-left: 22px; line-height: 1.9;">
            <li>写真は自動で長辺1280pxに縮小</li>
            <li>PDF、Word、Excel、PowerPointも添付可能</li>
            <li>1ファイル最大10MB、合計3個まで</li>
            <li>詳細画面でアイコンをタップして開く/ダウンロード</li>
          </ul>
        `)}
        
        ${this.section('👤 プロフィール', `
          <ul style="margin: 0; padding-left: 22px; line-height: 1.9;">
            <li>連絡先 (携帯電話・メール) を自分で変更可能</li>
            <li>派遣可否ステータスを変更可能</li>
            <li>氏名・所属の変更は県社協担当者にご連絡ください</li>
          </ul>
        `)}
        
        ${this.section('🔒 個人情報の取扱い', `
          <ul style="margin: 0; padding-left: 22px; line-height: 1.9;">
            <li>すべての通信は暗号化されています</li>
            <li>すべての操作は自動で記録されます</li>
            <li>個人を特定できる写真は撮影・投稿しないでください</li>
            <li>このURLは個人専用です。他の方には共有しないでください</li>
          </ul>
        `)}
        
        ${this.section('⚠️ 困ったとき', `
          <dl style="margin: 0; line-height: 1.7;">
            <dt style="font-weight: 600; margin-top: 6px;">アクセスできない</dt>
            <dd style="margin: 0 0 6px 16px; color: var(--color-text-muted); font-size: 13px;">
              県社協担当者にお問い合わせください。
            </dd>
            <dt style="font-weight: 600; margin-top: 6px;">表示がおかしい</dt>
            <dd style="margin: 0 0 6px 16px; color: var(--color-text-muted); font-size: 13px;">
              ブラウザを一度閉じて、再度開いてみてください。
            </dd>
            <dt style="font-weight: 600; margin-top: 6px;">投稿が反映されない</dt>
            <dd style="margin: 0 0 6px 16px; color: var(--color-text-muted); font-size: 13px;">
              他のアドバイザーの最新投稿が一覧に表示されるまで、最大5分かかる場合があります。
            </dd>
          </dl>
        `)}
        
        <div style="text-align: center; margin-top: 20px; padding: 16px; color: var(--color-text-light); font-size: 12px;">
          ご不明な点は県社協までお問い合わせください
        </div>
      </div>
    `;
  },
  
  /**
   * セクションを描画するヘルパー
   */
  section(title, contentHtml) {
    return `
      <div style="background: var(--color-surface); border: 0.5px solid var(--color-border-light); border-radius: var(--radius-md); padding: 14px 16px; margin-bottom: 12px;">
        <div style="font-size: 15px; font-weight: 600; color: var(--color-primary-dark); margin-bottom: 10px;">
          ${title}
        </div>
        <div style="font-size: 14px; color: var(--color-text); line-height: 1.7;">
          ${contentHtml}
        </div>
      </div>
    `;
  }
};
