// 出生届の画面（設計書5節2）。名刺風のカードに、生まれたときの姿を出す。
import { esc } from '../core/escape.js';
import { formatMan } from '../core/money-format.js';

export function birthView(card) {
  const row = (label, value) => `<div class="fact"><dt>${esc(label)}</dt><dd>${value}</dd></div>`;
  const sibs = card.siblings.length ? card.siblings.map(b => `${esc(b.label)}の${esc(b.name)}`).join('、') : 'いません';
  return `<div class="screen birth">
  <section class="card birth-card">
    <div class="birth-head"><span class="tag tag-solid">出生届</span><span class="birth-year">${esc(card.birthYear)}年</span></div>
    <div class="birth-who">
      <div class="avatar" aria-hidden="true">${esc([...card.given][0] ?? '')}</div>
      <div class="birth-name">${esc(card.name)}</div>
    </div>
    <p class="birth-lead">${esc(card.birthYear)}年、${esc(card.pref)}の${esc(card.surname)}家に、${esc(card.sexLabel)}が生まれました。</p>
    <dl class="facts">
      ${row('性別', esc(card.sex === 'female' ? '女性' : '男性'))}
      ${row('生まれた県', esc(card.pref))}
      ${card.parents.map(p => row(p.role, `${esc(p.name)}（${esc(p.age)}歳）<span class="fact-sub">${esc(p.job)}</span>`)).join('')}
      ${row('世帯年収', `${formatMan(card.houseIncome)}<span class="fact-sub"><span class="dots" aria-hidden="true">${esc(card.tierDots)}</span> ${esc(card.tierLabel)}</span>`)}
      ${row('きょうだい', sibs)}
      ${row('平均寿命', `約${esc(Math.round(card.e0))}歳`)}
      ${row('1倍速の長さ', `約${esc(card.minutes)}分`)}
    </dl>
    <p class="birth-note">この子は、いつか税理士になります。税理士として登録している8万人の中から引いた一生です。</p>
  </section>
  <button class="btn-primary" type="button" data-action="begin">人生を始める</button>
</div>`;
}
