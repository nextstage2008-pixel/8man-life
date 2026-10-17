// ご意見の板（下から出る）。書いた文は作者だけが読み、公開しない。名前や連絡先は書かないよう添える。
import { esc } from '../core/escape.js';
import { supportHtml } from './support.js';
import { feedbackContextLine } from '../core/net.js';

export const FEEDBACK_KINDS = [
  { k: 'mistake', label: '数字や事実の間違い' },
  { k: 'bug', label: '動きの不具合' },
  { k: 'other', label: '感想・そのほか' },
];

export function feedbackSheet({ context = {}, version = '', kind = 'mistake', sent = false, supportLines = [] } = {}) {
  const head = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="fb-title">
  <div class="sheet-handle" aria-hidden="true"></div>
  <h2 id="fb-title" class="sheet-title">ご意見</h2>`;
  if (sent) {
    return `${head}
  <p class="sheet-body">ありがとうございました。作者が読みます。</p>
  <button class="btn-primary" type="button" data-action="fb-close">閉じる</button>
</div>`;
  }
  const kinds = FEEDBACK_KINDS.map(c => `<button class="option" type="button" data-action="fb-kind" data-k="${esc(c.k)}" aria-pressed="${c.k === kind}"><span class="option-label">${esc(c.label)}</span></button>`).join('');
  return `${head}
  <p class="sheet-body">数字や事実の間違い、動きの不具合、感想を作者に送れます。</p>
  <div class="options">${kinds}</div>
  <label class="sheet-label" for="fb-text">書く（1000字まで）</label>
  <textarea id="fb-text" class="textarea" data-role="feedback" rows="4" maxlength="1000"></textarea>
  <p class="hint">名前や連絡先は書かないでください。</p>
  <p class="hint">${esc(feedbackContextLine(context, version))}</p>
  <div class="support-box" data-role="feedback-support" hidden>${supportLines.map(t => `<p>${supportHtml(t)}</p>`).join('')}</div>
  <p class="notice" data-role="feedback-error" hidden>送れませんでした。時間をおいてもう一度お試しください。</p>
  <button class="btn-primary" type="button" data-action="fb-send">送る</button>
  <button class="btn-soft" type="button" data-action="fb-close">閉じる</button>
</div>`;
}
