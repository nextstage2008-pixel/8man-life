// 分かれ道の板（下から出る・C カード）。
import { esc } from '../core/escape.js';

export function decisionSheet(view) {
  const fact = view.fact ? (typeof view.fact === 'string' ? view.fact : view.fact.text) : null;
  const choice = c => {
    const sub = c.sub ?? c.hint;
    return `<button class="choice" type="button" data-action="choose" data-k="${esc(c.k)}"><span class="choice-label">${esc(c.label)}</span>${sub ? `<span class="choice-sub">${esc(sub)}</span>` : ''}</button>`;
  };
  return `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
  <div class="sheet-handle" aria-hidden="true"></div>
  <div class="sheet-meta"><span class="tag tag-solid">分かれ道</span><span>${esc(view.age)}歳 · ${esc(view.year)}年</span></div>
  <h2 id="sheet-title" class="sheet-title">${esc(view.title)}</h2>
  <p class="sheet-body">${esc(view.body)}</p>
  ${fact ? `<p class="sheet-fact">${esc(fact)}</p>` : ''}
  <div class="choices">${view.choices.map(choice).join('')}</div>
  <button class="btn-soft" type="button" data-action="auto">おまかせで選ぶ</button>
  <p class="sheet-note">おまかせは、多くの人が選びそうな割合（推定）で選びます</p>
</div>`;
}
