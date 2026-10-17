// 人生の画面（設計書6.5・C カード）。上の欄（名前・立場・合格した科目・4つの数値）、1年ごとのカード、速さの欄。
import { esc } from '../core/escape.js';
import { supportHtml } from './support.js';
import { SITE } from '../site.js';
import { serverEnabled } from '../core/net.js';

const STATS = [['hl', '健康'], ['h', '幸福'], ['sm', '知識'], ['so', '人間関係']];
const TAG = { big: ['大事なこと', 'tag-accent'], warm: ['うれしいこと', 'tag-soft'], loss: ['かなしいこと', 'tag-gray'], dec: ['分かれ道', 'tag-line'], peer: ['同期', 'tag-soft'] };

export function lifeHeader({ card, age, year, roleLabel, subjects = [], stats = {}, site = SITE }) {
  const stat = ([k, label]) => {
    const v = Math.round(stats[k] ?? 0);
    return `<div class="stat"><span class="stat-label">${label}</span><span class="stat-num">${v}</span><div class="bar"><div class="bar-fill" style="width: ${v}%"></div></div></div>`;
  };
  return `<div class="profile">
  <div class="profile-top">
    <div class="avatar" aria-hidden="true">${esc([...card.given][0] ?? '')}</div>
    <div class="who"><div class="name">${esc(card.name)}</div><div class="meta">${esc(age)}歳 · ${esc(year)}年 · ${esc(card.pref)}</div></div>
    <div class="role">${esc(roleLabel)}</div>
    ${serverEnabled(site) ? '<button class="fb-btn" type="button" data-action="feedback" aria-label="ご意見を送る">ご意見</button>' : ''}
  </div>
  ${subjects.length ? `<div class="chips">${subjects.map(s => `<span class="chip ${s.state === 'exempt' ? 'chip-exempt' : 'chip-pass'}">${esc(s.name)}${s.state === 'exempt' ? 'は免除' : ''}</span>`).join('')}</div>` : ''}
  <div class="stats">${STATS.map(stat).join('')}</div>
</div>`;
}

export function lineHtml(line) {
  if (line.kind === 'reflect') return '';
  if (line.kind === 'imagine') return `<p class="imagine">${esc(line.text)}</p>`;
  if (line.kind === 'support') return `<p class="support">${supportHtml(line.text)}</p>`;
  if (line.kind === 're') return `<p class="line line-muted">${esc(line.text)}</p>`;
  // 年表の行（世の中の出来事・制度）は「世の中」の札。本人の大事なことと分ける
  if (line.source === 'history') return `<p class="line"><span class="tag tag-gray">世の中</span><span class="line-text">${esc(line.text)}</span></p>`;
  const tag = TAG[line.kind];
  const cls = line.kind === 'bad' ? 'line line-muted' : line.kind === 'big' ? 'line line-strong' : 'line';
  return `<p class="${cls}">${tag ? `<span class="tag ${tag[1]}">${tag[0]}</span>` : ''}<span class="line-text">${esc(line.text)}</span></p>`;
}

export function yearCard({ age, year, lines, current = false }) {
  return `<article class="year-card${current ? ' current' : ''}" data-age="${esc(age)}">
  <h3 class="year-head">${esc(age)}歳 · ${esc(year)}年</h3>
  ${lines.map(lineHtml).join('')}
</article>`;
}

const PAUSE = '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3v10M11 3v10" stroke="currentColor" stroke-width="2.2" fill="none"></path></svg>';
const PLAY = '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3l8 5-8 5z" fill="currentColor"></path></svg>';

export function controlsView({ speed = 1, state = 'running' }) {
  const paused = state === 'paused';
  return `<div class="controls">
  <div class="controls-row">
    <button class="btn-round" type="button" data-action="toggle" aria-label="${paused ? '再開' : '一時停止'}">${paused ? PLAY : PAUSE}</button>
    <div class="speeds" role="group" aria-label="速さ">${[1, 2, 4, 8, 16].map(x => `<button class="speed" type="button" data-action="speed" data-value="${x}" aria-pressed="${x === speed}">${x}×</button>`).join('')}</div>
  </div>
  <button class="btn-soft" type="button" data-action="skip">次の分かれ道まで進む</button>
</div>`;
}
