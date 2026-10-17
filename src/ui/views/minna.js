// みんなの集計の欄（最期の画面）と、最初の画面の人数の一行。
import { esc } from '../core/escape.js';

function chartSvg(chart, { width = 320, height = 96 } = {}) {
  const max = Math.max(1, ...chart.bars.map(b => b.n));
  const w = width / chart.bars.length;
  const top = 4, base = height - 16;
  const bars = chart.bars.map((b, i) => {
    const h = Math.round(((base - top) * b.n) / max);
    return `<rect x="${(i * w + 2).toFixed(1)}" y="${base - h}" width="${(w - 4).toFixed(1)}" height="${h}" rx="2" fill="${b.mine ? '#B5521A' : '#2C5AA0'}"></rect>`;
  }).join('');
  const labels = chart.bars.map((b, i) => (['1', '5', '10', '15', '16+'].includes(b.years)
    ? `<text x="${(i * w + w / 2).toFixed(1)}" y="${height - 3}" font-size="9" text-anchor="middle" fill="#4E5B6B">${esc(b.years)}</text>` : '')).join('');
  return `<svg width="100%" viewBox="0 0 ${width} ${height}" role="img" aria-label="合格までの年数の分布（橙があなた）">${bars}${labels}</svg>`;
}

export function minnaView({ rows = [], chart = null, lives = null } = {}) {
  if (!rows.length && !chart) return '';
  const list = rows.length
    ? `<ul class="minna-rows">${rows.map(r => `<li><span class="minna-title">${esc(r.title)}</span><span class="minna-choice">${esc(r.label)}</span><span class="minna-pct">みんなの${esc(r.pct)}%が同じ</span></li>`).join('')}</ul>`
    : '';
  const dist = chart
    ? `<h3 class="minna-sub">合格までの年数</h3>${chartSvg(chart)}<p class="hint">年数（${esc(chart.total.toLocaleString('ja-JP'))}人）。あなたより早くそろった人は${esc(chart.fasterPct)}%です。</p>`
    : '';
  const note = lives ? `<p class="hint">この版で最期まで見届けられた${esc(lives.toLocaleString('ja-JP'))}人の集計です。</p>` : '';
  return `<h2 class="sec">みんなの選択</h2>${list}${dist}${note}`;
}

export function livesLine(n) {
  return Number.isFinite(n) && n >= 1 ? `これまでに${n.toLocaleString('ja-JP')}人の一生が見届けられました` : '';
}
