// 共有ページ /s/{id}（設計書6.8）。サーバーが残した行から作る1枚の HTML（OGP つき）。
// 文はどれも計算から出たもので、遊んだ人が書いた文は入らない。それでも、すべて逃がして入れる。
import { esc } from '../core/escape.js';
import { supportHtml } from './support.js';
import { encodeReplay } from '../core/share.js';
import { authorLink } from './author.js';
import { SITE } from '../site.js';

const ROUTES = ['exam', 'tax-office', 'cpa', 'lawyer'];
const ERAS = ['heisei'];

// 時代と道ごとの固定の絵（1200×630）。知らない組み合わせは既定の絵
function imageUrl(origin, era, route) {
  const name = ERAS.includes(era) && ROUTES.includes(route) ? `${era}-${route}` : 'default';
  return `${origin}/assets/og/${name}.png`;
}

function page({ title, description, url, image }, body) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="noindex">
<meta property="og:type" content="article">
<meta property="og:site_name" content="8万分の1">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="/src/ui/style.css">
</head>
<body>
<main id="app"><div class="screen share">
  <header class="share-head"><a class="share-title" href="/">8万分の1</a></header>
${body}
  <footer class="credit">${authorLink(SITE)} · <a href="/about.html">データの解説</a> · <a href="/privacy.html">プライバシー</a></footer>
</div></main>
</body>
</html>
`;
}

function resultCard(c) {
  const num = (v, l, accent) => `<div class="num"><span class="num-v${accent ? ' num-accent' : ''}">${esc(v)}</span><span class="num-l">${esc(l)}</span></div>`;
  const row = (dt, dd) => `<div class="rc-row"><dt>${esc(dt)}</dt><dd>${esc(dd)}</dd></div>`;
  return `<section class="card result-card">
    <div class="rc-top"><span class="tag tag-solid">8万分の1</span><span class="rc-author">${authorLink(SITE)}</span></div>
    <div class="rc-who">
      <div class="avatar avatar-big" aria-hidden="true">${esc([...(c.given ?? c.name ?? '')][0] ?? '')}</div>
      <div><div class="rc-name">${esc(c.surname ? `${c.surname} ${c.given}` : c.name)}</div><div class="rc-meta">${esc(c.birthYear)}年 ${esc(c.pref)}生まれ · ${esc(c.deathAge)}歳</div></div>
    </div>
    <div class="rc-nums">${num(c.n1, c.l1)}${num(`${c.clientsMax}件`, '顧問先の最多')}${num(`${c.deathAge}歳`, c.causeLabel, true)}</div>
    <dl class="rc-rows">${row('科目の順', c.subjectLine)}${row('働いた所', c.workLine)}${row('同期4人', c.peerSummary)}</dl>
    <div class="rc-hash">#8万分の1</div>
  </section>`;
}

export function sharePageView(row, { origin, currentVersion, supportLines = [] }) {
  const c = row.card ?? {};
  const sameVersion = row.v === currentVersion;
  const hash = encodeReplay({ version: row.v, seed: row.seed, birthMode: row.mode === 'p' ? 'population' : 'births', answers: [...String(row.answers)].map(Number) });
  const body = `  ${resultCard(c)}
  <p class="share-desc">${esc(row.description)}</p>
  ${c.suicide ? `<section class="support-box" role="note">${supportLines.map(t => `<p>${supportHtml(t)}</p>`).join('')}</section>` : ''}
  <div class="actions">
    ${sameVersion ? `<a class="btn-primary" href="${esc(`/${hash}`)}">この人生を見る</a>` : '<p class="notice">版が変わったため、この人生をもう一度流すことはできません。</p>'}
    <a class="btn-soft" href="/">自分も生まれてみる</a>
  </div>`;
  return page({ title: row.title, description: row.description, url: `${origin}/s/${row.id}`, image: imageUrl(origin, row.era, row.route) }, body);
}

export function notFoundPageView({ origin }) {
  const body = `  <section class="card"><p>この共有ページは見つかりませんでした。リンクが途中で切れているか、消されたのかもしれません。</p></section>
  <div class="actions"><a class="btn-primary" href="/">最初の画面へ</a></div>`;
  return page({ title: '見つかりませんでした｜8万分の1', description: 'この共有ページは見つかりませんでした。', url: `${origin}/`, image: imageUrl(origin) }, body);
}
