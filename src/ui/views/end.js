// 最期と結果の画面（設計書6.7・C カード）。手で書くひとことは、この端末の中だけ（札にも投稿にも入らない）。
import { esc } from '../core/escape.js';
import { supportHtml } from './support.js';
import { pageLinks } from './start.js';
import { authorLink } from './author.js';
import { SITE } from '../site.js';
import { formatMan } from '../core/money-format.js';

const LEGEND = [['hl', '健康', '#2C5AA0', ''], ['h', '幸福', '#B5521A', ''], ['sm', '知識', '#1D2733', '4 3'], ['so', '人間関係', '#7A8CA3', '']];

export function statsSvg(stats, { width = 320, height = 120 } = {}) {
  const line = ([k, , color, dash]) => {
    const v = stats[k] ?? [];
    if (v.length < 2) return '';
    const pts = v.map((y, i) => `${((i / (v.length - 1)) * width).toFixed(1)},${(height - (y / 100) * height).toFixed(1)}`).join(' ');
    return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2"${dash ? ` stroke-dasharray="${dash}"` : ''}></polyline>`;
  };
  return `<svg width="100%" viewBox="0 0 ${width} ${height}" role="img" aria-label="一生の数値の移り変わり（健康・幸福・知識・人間関係）">${LEGEND.map(line).join('')}</svg>`;
}

// 札の1つめの大きな数字（道ごと）。共有ページの札にも使う
export function firstNum(m) {
  if (m.route === 'exam') return [`${m.passYears}年`, m.gradExempt ? 'そろうまで' : '合格まで'];
  if (m.route === 'tax-office') return [`${m.taxOfficeYears}年`, '税務署に勤めて'];
  if (m.route === 'cpa') return ['会計士', '公認会計士から'];
  return ['弁護士', '弁護士から'];
}

// お金のまとめ：いちばん多かった年収・最期の貯蓄・借入金を返し終えた年（または残った額・借りなかった）
function moneySection(money) {
  if (!money) return '';
  const dansin = money.dansin > 0 ? `家のローンの残り${formatMan(money.dansin)}は、団体信用生命保険で返されました` : '';
  const debt = money.debtAtDeath > 0 ? `${formatMan(money.debtAtDeath)}の借入が残りました${dansin ? `（${dansin}）` : ''}` : dansin || (money.debtFreeAge != null ? `${money.debtFreeAge}歳で借入金を返し終えました` : money.everBorrowed ? '借入金は返し終えました' : '借入はありませんでした');
  return `<section class="card"><h2 class="sec">お金</h2><dl class="money-sum">
  <div><dt>いちばん多かった年収</dt><dd>${formatMan(money.maxIncome)}${money.maxIncomeAge != null ? `（${money.maxIncomeAge}歳）` : ''}</dd></div>
  <div><dt>最期の貯蓄</dt><dd>${formatMan(money.finalSavings)}</dd></div>
  <div><dt>借入金</dt><dd>${esc(debt)}</dd></div>
</dl></section>`;
}

export function endView(m, { supportLines = [] } = {}) {
  const [n1, l1] = firstNum(m);
  const num = (v, l, accent) => `<div class="num"><span class="num-v${accent ? ' num-accent' : ''}">${esc(v)}</span><span class="num-l">${esc(l)}</span></div>`;
  const row = (dt, dd) => `<div class="rc-row"><dt>${esc(dt)}</dt><dd>${esc(dd)}</dd></div>`;
  const finals = m.finalLines.filter(l => l.kind !== 'support');
  const share = m.causeShare != null ? `<p>同じ年齢で亡くなった人のうち、${esc(m.causeLabel)}で亡くなった人はおよそ${esc(Math.round(m.causeShare * 100))}%です。</p>` : '';
  return `<div class="screen end">
  <section class="final">${finals.map((l, i) => `<p class="${i === 0 ? 'final-main' : 'final-sub'}">${esc(l.text)}</p>`).join('')}</section>
  ${m.suicide ? `<section class="support-box" role="note">${supportLines.map(t => `<p>${supportHtml(t)}</p>`).join('')}</section>` : ''}
  <section class="card result-card">
    <div class="rc-top"><span class="tag tag-solid">8万分の1</span><span class="rc-author">${authorLink(SITE)}</span></div>
    <div class="rc-who">
      <div class="avatar avatar-big" aria-hidden="true">${esc([...(m.given ?? m.name)][0] ?? '')}</div>
      <div><div class="rc-name">${esc(m.surname ? `${m.surname} ${m.given}` : m.name)}</div><div class="rc-meta">${esc(m.birthYear)}年 ${esc(m.pref)}生まれ · ${esc(m.deathAge)}歳</div></div>
    </div>
    ${m.scene ? `<canvas class="scene-canvas rc-scene" data-role="end-scene" role="img" aria-label="${esc(m.scene.caption)}" width="512" height="160"></canvas>` : ''}
    <div class="rc-nums">${num(n1, l1)}${num(`${m.clientsMax}件`, '顧問先の最多')}${num(`${m.deathAge}歳`, m.causeLabel, true)}</div>
    <dl class="rc-rows">${row('科目の順', m.subjectLine)}${row('働いた所', m.workLine)}${row('同期4人', m.peers.map(p => `${p.name}：${p.text}`).join('／'))}</dl>
    <div class="rc-hash">#8万分の1</div>
  </section>
  <div class="actions">
    <button class="btn-primary" type="button" data-action="post">Xに投稿する</button>
    <div class="actions-row">
      <button class="btn-plain" type="button" data-action="save">画像を保存</button>
      <button class="btn-soft" type="button" data-action="again">もう一度生まれる</button>
    </div>
  </div>
  <section class="card"><h2 class="sec">まれさ</h2><p>${esc(m.rarity.text)}</p>${share}</section>
  <section class="card" data-role="minna" hidden></section>
  ${moneySection(m.money)}
  <section class="card"><h2 class="sec">一生の数値</h2>${statsSvg(m.stats)}<p class="legend">${LEGEND.map(([, label, color]) => `<span class="legend-item"><span class="legend-mark" style="background: ${color}"></span>${label}</span>`).join('')}</p></section>
  <section class="card"><h2 class="sec">大事な瞬間</h2><ol class="timeline">${m.timeline.map(t => `<li><span class="tl-age">${esc(t.age)}歳</span><span>${esc(t.text)}</span></li>`).join('')}</ol></section>
  <section class="card"><h2 class="sec">同期4人のその後</h2><ul class="peers">${m.peers.map(p => `<li><span class="peer-name">${esc(p.name)}</span><span>${esc(p.text)}</span></li>`).join('')}</ul></section>
  <section class="card"><label class="sec" for="hitokoto">故人へのひとこと</label><p class="hint">この端末の中だけです。投稿や札には入りません。</p><textarea id="hitokoto" class="textarea" data-role="hitokoto" rows="2"></textarea><div class="support-box" data-role="hitokoto-support" hidden>${supportLines.map(t => `<p>${supportHtml(t)}</p>`).join('')}</div></section>
  ${pageLinks()}
</div>`;
}
