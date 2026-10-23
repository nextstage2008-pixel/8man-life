// 資格を取った札。流れを止めて、画面の真ん中に大きく出す。画面のどこを触っても続く（main.js の event-ok）。
// 出すのは受かったときだけ：試験組は5科目がそろったとき（大学院の免除の人は認定でそろったとき）、
// 会計士は公認会計士試験、弁護士は司法試験に受かったとき。試験のない税務署の人は、税理士として登録したとき
// 見出しは2段：上に小さく試験の名前、下に大きく結果（長い見出しが途中で折り返さないように）
import { esc } from '../core/escape.js';

const EVENT = {
  kanpou: { sub: '税理士試験', big: '官報合格' },
  gakui: { sub: '大学院の免除の認定で', big: '資格取得' },
  cpa: { sub: '公認会計士試験', big: '合格' },
  law: { sub: '司法試験', big: '合格' },
  ob: { sub: '試験の免除で', big: '税理士登録' },
};

export function eventView(line) {
  const e = EVENT[line.milestone] ?? { sub: '', big: '' };
  return `<div class="event-card" role="dialog" aria-modal="true" aria-labelledby="event-title">
  <p class="event-when">${esc(line.age)}歳 · ${esc(line.year)}年</p>
  <h2 class="event-title" id="event-title"><span class="event-sub">${esc(e.sub)}</span> <span class="event-big">${esc(e.big)}</span></h2>
  <p class="event-text">${esc(line.text)}</p>
  <button class="btn-primary" type="button" data-action="event-ok">続ける</button>
  <p class="event-hint">画面のどこを触っても続きます</p>
</div>`;
}
