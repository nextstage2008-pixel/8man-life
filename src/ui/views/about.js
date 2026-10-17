// データの解説（設計書7節）。データの出典（SOURCES）と推定の値（estimated: true）から作る。
import { esc } from '../core/escape.js';
import { listEstimates } from '../../engine/estimates.js';
import { ESTIMATE_LABELS, ESTIMATE_UNITS, SEGMENT_LABELS } from '../../data/explain.js';
import { authorLink } from './author.js';
import { SITE } from '../site.js';
import { serverEnabled } from '../core/net.js';

// いちばん長く一致する頭を探す
const prefixOf = (path, map) => Object.keys(map).filter(p => path === p || path.startsWith(`${p}.`)).sort((a, b) => b.length - a.length)[0] ?? null;

function nodeAt(data, path) {
  return path.split('.').reduce((n, k) => (n == null ? n : n[k]), data);
}

// 場所の後ろの部分から「（男性・60〜69歳）」のような添え書きを作る
function qualifier(data, path, prefix) {
  const rest = path.slice(prefix.length + 1).split('.').filter(Boolean);
  const parts = [];
  let base = prefix;
  for (const seg of rest) {
    base = `${base}.${seg}`;
    if (SEGMENT_LABELS[seg]) parts.push(SEGMENT_LABELS[seg]);
    else if (/^\d+$/.test(seg)) {
      const n = nodeAt(data, base);
      if (n && n.from != null && n.to != null) parts.push(n.to >= 100 ? `${n.from}歳以上` : `${n.from}〜${n.to}歳`);
    }
  }
  return parts.length ? `（${parts.join('・')}）` : '';
}

function valueText(path, value) {
  if (typeof value !== 'number') return '';
  const unit = prefixOf(path, ESTIMATE_UNITS);
  if (unit) return ESTIMATE_UNITS[unit](value);
  if (value > 0 && value < 1) return value < 0.1 ? `${(value * 100).toFixed(1)}%` : `${Math.round(value * 100)}%`;
  return String(value);
}

export function aboutView(data, site = SITE) {
  const total = data.ROUTES.registrantsByFY[2025].total.toLocaleString('ja-JP');
  const sources = Object.values(data.SOURCES).map(s => `<li>${s.url ? `<a href="${esc(s.url)}" rel="noopener">${esc(s.title)}</a>` : esc(s.title)}</li>`).join('');
  const estimates = listEstimates(data).map(e => {
    const prefix = prefixOf(e.path, ESTIMATE_LABELS);
    const label = (prefix ? ESTIMATE_LABELS[prefix] : e.path) + (prefix ? qualifier(data, e.path, prefix) : '');
    const v = valueText(e.path, e.value);
    return `<li class="est"><span class="est-label">${esc(label)}</span>${v ? `<span class="est-value">${esc(v)}</span>` : ''}${e.note ? `<span class="est-note">${esc(e.note)}</span>` : ''}</li>`;
  }).join('');
  return `<div class="screen page">
  <header class="share-head"><a class="share-title" href="./">8万分の1</a></header>
  <h1 class="page-title">データの解説</h1>
  <section class="card">
    <h2 class="sec">仕組み</h2>
    <p>引くのは、税理士として登録している${esc(total)}人（令和7年度末・国税庁の統計年報）のうちの1人です。だから、この人は必ず税理士になります。受験をやめる人生は、同期4人の中で見せます。</p>
    <p>生まれる県・男女・家の暮らし向き、出来事の起こりやすさは、公的な統計の基準の値に、その人の状態による倍率をかけて決めています。たとえば合格の確率は、科目ごとの合格率に、勉強の重点・働きながらかどうか・年齢などの倍率をかけたものです。</p>
    <p>2026年より先の年の出来事は想像です。合格率や制度は2026年の値で止めています。場面の文は作者が書いたもので、実在の人・事務所・予備校とは関係ありません。</p>
  </section>
  <section class="card">
    <h2 class="sec">出典</h2>
    <ul class="src-list">${sources}</ul>
  </section>
  <section class="card">
    <h2 class="sec">推定の値</h2>
    <p class="hint">公表されたデータがないため、作者が置いた値です。</p>
    <ul class="est-list">${estimates}</ul>
    <p class="hint">ほかに、計算の中の倍率（勉強の重点による合格の倍率など）も推定です。</p>
  </section>
  <section class="card">
    <h2 class="sec">間違いに気づいたら</h2>
    <p>${serverEnabled(site) ? '数字や事実の間違いは、<a href="./#feedback">ご意見の窓口</a>から教えてください。直していきます。' : `数字や事実の間違いは、作者の X（${authorLink(site)}）にお知らせください。直していきます。`}</p>
  </section>
  <footer class="credit">${authorLink(site)} · <a href="privacy.html">プライバシー</a></footer>
</div>`;
}
