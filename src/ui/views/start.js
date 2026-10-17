// 最初の画面（設計書5節1・6.6の注意書き）。時代は v1 では平成だけ選べる。
import { esc } from '../core/escape.js';
import { authorLink } from './author.js';
import { SITE } from '../site.js';
import { serverEnabled } from '../core/net.js';

const ERAS = [
  { label: '平成', sub: '2000年ごろ生まれ', ready: true },
  { label: '昭和の高度成長', sub: '1950年ごろ生まれ', ready: false },
  { label: '昭和の終わり', sub: '1975年ごろ生まれ', ready: false },
  { label: 'これから', sub: '2026年生まれ・想像', ready: false },
  { label: 'おまかせ', sub: '4つからくじ', ready: false },
];

// 下の欄：作者と、データの解説・プライバシー・ご意見（最期の画面でも使う）。サーバーのない版ではご意見を出さない
export function pageLinks(site = SITE) {
  const fb = serverEnabled(site) ? ' · <button class="link-btn" type="button" data-action="feedback">ご意見</button>' : '';
  return `<footer class="credit">${authorLink(site)} · <a href="about.html">データの解説</a> · <a href="privacy.html">プライバシー</a>${fb}</footer>`;
}

export function startView({ birthMode = 'births', resumable = null, notice = null } = {}) {
  const era = e => `<button class="option" type="button" ${e.ready ? 'aria-pressed="true"' : 'disabled'}><span class="option-label">${esc(e.label)}</span><span class="option-sub">${esc(e.ready ? e.sub : '準備中')}</span></button>`;
  const mode = (value, label, sub) => `<button class="option" type="button" data-action="mode" data-value="${value}" aria-pressed="${birthMode === value}"><span class="option-label">${esc(label)}</span><span class="option-sub">${esc(sub)}</span></button>`;
  return `<div class="screen start">
  <header class="start-head">
    <h1 class="title">8万分の1</h1>
    <p class="lead">税理士として登録している8万2,513人の中から、1人の一生を引きます。生まれた日から最期の日まで、分かれ道だけを選んで見届けてください。</p>
    <p class="lives" data-role="lives" hidden></p>
  </header>
  ${notice ? `<p class="notice" role="status">${esc(notice)}</p>` : ''}
  <section class="card">
    <h2 class="sec">時代</h2>
    <div class="options">${ERAS.map(era).join('')}</div>
  </section>
  <section class="card">
    <h2 class="sec">生まれる場所の決め方</h2>
    <div class="options">${mode('births', 'いま生まれる赤ちゃん', '県ごとの出生数で引く')}${mode('population', 'いま生きている人', '県ごとの人口で引く')}</div>
  </section>
  <p class="caution">死・病気・心の不調の描写を含みます。</p>
  <button class="btn-primary" type="button" data-action="start">生まれる</button>
  ${resumable ? `<button class="btn-soft" type="button" data-action="resume">続きから · ${esc(resumable.label)}</button>` : ''}
  ${pageLinks()}
</div>`;
}
