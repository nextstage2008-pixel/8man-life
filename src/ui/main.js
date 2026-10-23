// 画面の切り替えと配線。DOM に触れるのはここと card.js だけ（ほかは純粋な関数で、node のテストで確かめる）。
import { DATA } from '../data/index.js';
import { WORLD, birthCard } from '../engine/life.js';
import { SUPPORT_LINES } from '../data/events/family.js';
import { esc } from './core/escape.js';
import { supportHtml } from './views/support.js';
import { createPlayer } from './core/player.js';
import { resultModel } from './core/result.js';
import { statusOf } from './core/status.js';
import { hasDanger, markSuppressed, isSuppressed, suppressFromAfter } from './core/safety.js';
import { decodeReplay, postText, xIntentUrl, shareLink } from './core/share.js';
import { saveProgress, loadProgress, clearProgress, shouldClearProgress, staleProgress } from './core/save.js';
import { startView } from './views/start.js';
import { pickLitPref } from './views/japan-map.js';
import { birthView } from './views/birth.js';
import { lifeBar, statsBlock, sceneBlock, yearCard, lineHtml, controlsView, moneyRow } from './views/life.js';
import { sceneOf, sceneLayout } from './core/scene.js';
import { drawScene } from './scene-canvas.js';
import { emptyLog, addToLog } from './core/log-order.js';
import { decisionSheet } from './views/decision.js';
import { eventView } from './views/event.js';
import { endView } from './views/end.js';
import { trackingRefused, livesPayload, sameChoiceRows, passYearsChart } from './core/minna.js';
import { resolveShareUrl, feedbackPayload, openPostWindow, serverEnabled } from './core/net.js';
import { minnaView, livesLine } from './views/minna.js';
import { feedbackSheet } from './views/feedback.js';
import { postJson, getJson } from './api.js';
import { SITE } from './site.js';
import { analyticsBeacon } from './core/analytics.js';

const VERSION = DATA.DATA_VERSION;
const app = document.getElementById('app');
const store = (() => { try { return window.localStorage; } catch { return null; } })();
// screen：いま出ている画面（start・birth・life・end）。replay：再現リンクで人の人生を見ている（集計に送らない）
const S = { birthMode: 'births', config: null, card: null, player: null, pendingAnswers: null, fast: true, raf: 0, last: 0, years: new Map(), result: null, shareUrl: '', shareInfo: null, sharePromise: null, supportNext: null, screen: 'start', replay: false, fb: null };

const getPref = (k, d) => { try { return store?.getItem(k) ?? d; } catch { return d; } };
const setPref = (k, v) => { try { store?.setItem(k, String(v)); } catch { /* 残せなくても続ける */ } };

// 種は端末の乱数で作る（計算の側は Math.random を使わない）
function newSeed() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % 1000000000;
}

// 30日の判定止めのあいだは、新しい人生でも自殺の判定をしない（再現リンクでも同じ。安全を先にする）。
// 止めは suppressFrom（0 なら生まれたときから）で持ち、続きからの保存にも残す
function makeConfig(seed, birthMode, suppressFrom) {
  const c = { seed, era: 'heisei', birthMode };
  const from = suppressFrom ?? (isSuppressed(store, Date.now()) ? 0 : undefined);
  if (from != null) c.suppressFrom = from;
  return c;
}

function stop() {
  if (S.raf) cancelAnimationFrame(S.raf);
  S.raf = 0;
}

// 最初の画面の地図：3秒ごとに出生数の重みで1県を選び、その丸を1.5秒だけ灯す（動きを減らす設定なら動かさない）
let mapTimer = 0;
function startMapLights() {
  clearInterval(mapTimer);
  mapTimer = 0;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  mapTimer = setInterval(() => {
    const map = app.querySelector('.jp-map');
    if (S.screen !== 'start' || !map) { clearInterval(mapTimer); mapTimer = 0; return; }
    const name = pickLitPref(DATA.PREFS, Math.random());
    const dots = [...map.querySelectorAll('.pref-dot')].filter(d => d.dataset.pref === name);
    dots.forEach(d => d.classList.add('lit'));
    setTimeout(() => dots.forEach(d => d.classList.remove('lit')), 1500);
  }, 3000);
}

function showStart(notice = null) {
  stop();
  S.screen = 'start';
  // 前の版の「続きから」は使えないので、消したことを一度だけ知らせる
  if (staleProgress(store, VERSION)) { clearProgress(store); notice = notice ?? '版が新しくなったため、前の「続きから」は使えなくなりました。新しく生まれてみてください。'; }
  const p = loadProgress(store, VERSION);
  app.innerHTML = startView({ birthMode: S.birthMode, resumable: p ? { label: p.label } : null, notice });
  window.scrollTo(0, 0);
  startMapLights();
  // これまでに見届けられた人生の数（サーバーがなければ出さない）
  getJson('/api/stats').then(s => {
    const el = app.querySelector('[data-role="lives"]');
    const text = livesLine(s?.livesAll);
    if (el && text) { el.textContent = text; el.hidden = false; }
  });
}

function showBirth(config, answers = null, fast = true, replay = false) {
  stop();
  S.screen = 'birth';
  S.replay = replay;
  S.config = config;
  S.card = birthCard(config, DATA);
  S.pendingAnswers = answers;
  S.fast = fast;
  app.innerHTML = birthView(S.card);
  window.scrollTo(0, 0);
}

function beginLife() {
  S.screen = 'life';
  S.sharePromise = null;
  S.player = createPlayer(S.config, { data: DATA, world: WORLD, answers: S.pendingAnswers, fast: S.fast, events: true });
  S.player.setSpeed(Number(getPref('8man.speed', 1)) || 1);
  S.years = new Map();
  S.log = emptyLog();
  S.sceneState = null;
  S.sceneSig = '';
  S.money = null;
  S.moneySig = '';
  app.innerHTML = '<div class="screen life"><div id="bar"></div><div id="scene"></div><div id="stats"></div><section id="log" class="log" aria-live="polite"></section></div><div class="controls-wrap" id="controls"></div><div class="sheet-wrap" id="sheet" hidden></div><div class="event-wrap" id="event" data-action="event-ok" hidden></div>';
  renderControls();
  updateProfile(0, S.card.birthYear);
  window.scrollTo(0, 0);
  S.last = performance.now();
  const loop = now => {
    const dt = (now - S.last) / 1000;
    S.last = now;
    handle(S.player.tick(dt));
    if (S.player.state !== 'ended') S.raf = requestAnimationFrame(loop);
  };
  S.raf = requestAnimationFrame(loop);
}

// 記録は新しい順（本家と同じ）。上に新しい行と場面の絵が来るので、下へは送らない
function handle(events) {
  if (!events.length) return;
  for (const e of events) {
    if (e.type === 'line') addLine(e.line);
    else if (e.type === 'decision') { drawLatestScene(); drawLatestMoney(); showDecision(e.view); }
    else if (e.type === 'event') { drawLatestScene(); drawLatestMoney(); showEvent(e.line); }
    else if (e.type === 'end') { showEnd(); return; }
  }
  drawLatestScene();
  drawLatestMoney();
}

// 新しい年のカードはいちばん上に作り、行はそのカードの見出しのすぐ下（＝いちばん上）に足す（core/log-order.js の決まり）
function addLine(line) {
  const r = addToLog(S.log, line);
  S.log = r.log;
  if (line.scene) S.sceneState = line.scene;
  if (line.money) S.money = line.money;
  let el = S.years.get(line.age);
  if (r.op.newCard || !el) {
    document.querySelector('.year-card.current')?.classList.remove('current');
    const box = document.createElement('div');
    box.innerHTML = yearCard({ age: line.age, year: line.year, lines: [], current: true });
    el = box.firstElementChild;
    document.getElementById('log').prepend(el);
    S.years.set(line.age, el);
    updateProfile(line.age, line.year);
  }
  const html = lineHtml(line);
  if (html) el.querySelector('.year-head').insertAdjacentHTML('afterend', html);
}

// 年収・貯蓄・借入金：いちばん新しい行の money で、変わったときだけ書き直す
function drawLatestMoney() {
  const card = document.querySelector('#stats .stats-card');
  if (!card || !S.money) return;
  const sig = JSON.stringify(S.money);
  if (sig === S.moneySig && card.querySelector('.money')) return;
  S.moneySig = sig;
  const old = card.querySelector('.money');
  if (old) old.outerHTML = moneyRow(S.money); else card.insertAdjacentHTML('beforeend', moneyRow(S.money));
}

// 場面の絵：いちばん新しい行の状態で、変わったときだけ描き直す
function drawLatestScene() {
  const box = document.getElementById('scene');
  if (!S.sceneState || !box) return;
  const sc = sceneOf(S.sceneState);
  const sig = JSON.stringify(sc);
  if (sig === S.sceneSig) return;
  S.sceneSig = sig;
  if (!box.firstElementChild) box.innerHTML = sceneBlock({ caption: sc.caption });
  else {
    box.querySelector('.scene-caption').textContent = sc.caption;
    box.querySelector('canvas').setAttribute('aria-label', sc.caption);
  }
  drawScene(box.querySelector('canvas'), sceneLayout(sc), 4);
}

function updateProfile(age, year) {
  const last = S.player?.trace.at(-1);
  const st = statusOf(last ?? { age, career: {} }, 'exam', DATA);
  document.getElementById('bar').innerHTML = lifeBar({ card: S.card, age, year, roleLabel: st.roleLabel });
  document.getElementById('stats').innerHTML = statsBlock({ subjects: st.subjects, stats: last?.stats ?? S.card.stats, money: S.money ?? null });
  S.moneySig = JSON.stringify(S.money ?? null);
}

function renderControls() {
  const el = document.getElementById('controls');
  if (el) el.innerHTML = controlsView({ speed: S.player.speed, state: S.player.state });
}

function showDecision(view) {
  saveProgress(store, {
    version: VERSION, seed: S.config.seed, birthMode: S.config.birthMode, answers: [...S.player.answers],
    ...(S.config.suppressFrom != null ? { suppressFrom: S.config.suppressFrom } : {}),
    label: `${S.card.pref}、${view.age}歳の${S.card.name}`,
  });
  const sheet = document.getElementById('sheet');
  sheet.innerHTML = decisionSheet(view);
  sheet.hidden = false;
  sheet.querySelector('.choice')?.focus({ preventScroll: true });
}

function closeSheet() {
  const sheet = document.getElementById('sheet');
  if (!sheet) return;
  sheet.hidden = true;
  sheet.innerHTML = '';
}

// 資格を取った札：流れを止めて真ん中に出し、画面のどこかを触ったら閉じて続ける
function showEvent(line) {
  const el = document.getElementById('event');
  if (!el) return;
  el.innerHTML = eventView(line);
  el.hidden = false;
  el.querySelector('[data-action="event-ok"]')?.focus({ preventScroll: true });
}

function closeEvent() {
  const el = document.getElementById('event');
  if (!el || el.hidden) return;
  el.hidden = true;
  el.innerHTML = '';
  S.player?.continueEvent();
}

// 答える
function choose(k) {
  const view = S.player.currentDecision;
  if (!view) return;
  closeSheet();
  S.player.answer(k);
}

function showEnd() {
  stop();
  S.screen = 'end';
  if (shouldClearProgress(loadProgress(store, VERSION), S.config)) clearProgress(store);
  const p = S.player;
  S.result = resultModel({ lines: p.lines, summary: p.summary, trace: p.trace }, DATA);
  S.shareInfo = { version: VERSION, seed: S.config.seed, birthMode: S.config.birthMode, answers: [...p.answers] };
  S.sharePromise = null;
  S.shareUrl = shareLink(`${location.origin}${location.pathname}`, { ...S.shareInfo, suppressFrom: S.config.suppressFrom }, p.summary, DATA, WORLD);
  app.innerHTML = endView(S.result, { supportLines: SUPPORT_LINES });
  const endCanvas = app.querySelector('[data-role="end-scene"]');
  if (endCanvas && S.result.scene) drawScene(endCanvas, sceneLayout(S.result.scene), 4);
  window.scrollTo(0, 0);
  sendLife(p);
}

// みんなの集計：自分の人生なら1人分を送り（トラッキング拒否なら送らない）、そのあと集計を読んで最期の画面に出す
function sendLife(p) {
  const life = { summary: p.summary, views: [...p.views], result: S.result };
  const show = async () => {
    const stats = await getJson('/api/stats');
    const el = app.querySelector('[data-role="minna"]');
    if (!stats || !el || S.result !== life.result) return;
    const rows = sameChoiceRows(stats, life.views, life.summary.decisions);
    const chart = life.summary.route === 'exam' ? passYearsChart(stats, life.summary.passYears) : null;
    const html = minnaView({ rows, chart, lives: stats.lives });
    if (html) { el.innerHTML = html; el.hidden = false; }
  };
  if (S.replay || trackingRefused(navigator, window)) { show(); return; }
  postJson('/api/lives', livesPayload(life.summary, VERSION)).then(show);
}

// 投稿：押したときに窓を開いておき（あとから開くと止められる）、共有ページの URL ができたらそこへ移す。
// 共有ページが作れなければ再現リンクで投稿する。共有の URL は1つの人生で1回だけ作る
function post() {
  const w = window.open('', '_blank');
  if (w) w.opener = null;
  S.sharePromise ??= resolveShareUrl((path, body) => postJson(path, body), { info: S.shareInfo, fallback: S.shareUrl, origin: location.origin });
  const result = S.result;
  S.sharePromise.then(url => {
    const href = xIntentUrl(postText(result, url, { handle: SITE.authorHandle }));
    if (!w) location.href = href; // 窓が開けなかったときだけ今の窓で移る
    else openPostWindow(w, href); // 人が窓を閉じていたら何もしない
  });
}

// ご意見の板。人生の途中なら止め、閉じたら止める前に戻す。一緒に送る人生の情報は計算から出たものだけ
function fbWrap() {
  let el = document.getElementById('fb');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fb';
    el.className = 'sheet-wrap';
    el.hidden = true;
    document.body.appendChild(el);
  }
  return el;
}

function feedbackContext() {
  const mode = S.config?.birthMode === 'population' ? 'p' : 'b';
  const answersOf = p => { const a = p.answers.join(''); return /^\d{0,80}$/.test(a) ? a : undefined; };
  if (S.screen === 'life' && S.player) {
    const last = [...S.player.lines].reverse().find(l => l.kind !== 'reflect');
    return { seed: S.config.seed, mode, answers: answersOf(S.player), age: last?.age ?? 0, year: last?.year ?? S.card.birthYear, screen: 'life', lastLine: last?.text };
  }
  if (S.screen === 'end' && S.result) {
    return { seed: S.config.seed, mode, answers: answersOf(S.player), age: S.result.deathAge, year: S.result.deathYear, screen: 'end', lastLine: S.result.finalLines[0]?.text };
  }
  if (S.screen === 'birth' && S.config) return { seed: S.config.seed, mode, screen: 'start' };
  return { screen: 'start' };
}

function openFeedback() {
  if (S.fb || !serverEnabled(SITE)) return; // サーバーのない版（GitHub Pages）には、ご意見の窓口がない
  const running = S.screen === 'life' && S.player?.state === 'running';
  if (running) { S.player.pause(); renderControls(); }
  S.fb = { wasRunning: running, kind: 'mistake', context: feedbackContext() };
  const el = fbWrap();
  el.innerHTML = feedbackSheet({ context: S.fb.context, version: VERSION, supportLines: SUPPORT_LINES });
  el.hidden = false;
  el.querySelector('[data-role="feedback"]')?.focus({ preventScroll: true });
}

function closeFeedback() {
  const el = document.getElementById('fb');
  if (el) { el.hidden = true; el.innerHTML = ''; }
  if (S.fb?.wasRunning && S.player?.state === 'paused') { S.player.resume(); renderControls(); }
  S.fb = null;
}

async function sendFeedback(btn) {
  const el = document.getElementById('fb');
  const box = el?.querySelector('[data-role="feedback"]');
  if (!S.fb || !box) return;
  if (!box.value.trim()) { box.focus(); return; }
  btn.disabled = true;
  const fb = S.fb;
  const r = await postJson('/api/feedback', feedbackPayload({ version: VERSION, kind: fb.kind, text: box.value, context: fb.context }));
  if (S.fb !== fb) return;
  if (r) el.innerHTML = feedbackSheet({ sent: true });
  else { btn.disabled = false; el.querySelector('[data-role="feedback-error"]').hidden = false; }
}

async function saveImage() {
  const { saveCard } = await import('./card.js');
  await saveCard(S.result);
}

// 故人へのひとこと・ご意見に危ない言葉が書かれたら、相談先を出し、30日の判定止めを入れる。
// 人生の途中のご意見なら、振り返りと同じく、この人生のその年齢から先の判定も止める
document.addEventListener('input', ev => {
  const role = ev.target.dataset?.role;
  if ((role !== 'hitokoto' && role !== 'feedback') || !hasDanger(ev.target.value)) return;
  const box = document.querySelector(`[data-role="${role}-support"]`);
  if (!box?.hidden) return;
  box.hidden = false;
  markSuppressed(store, Date.now());
  if (role === 'feedback' && S.screen === 'life' && S.config && S.fb?.context.age != null) {
    S.config.suppressFrom = suppressFromAfter(S.config.suppressFrom, S.fb.context.age);
  }
});

// 画面（#app）とご意見の板（#fb）の両方のボタンを受ける
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-action]');
  if (!b || b.disabled) return;
  const a = b.dataset.action;
  if (a === 'mode') { S.birthMode = b.dataset.value === 'population' ? 'population' : 'births'; showStart(); }
  else if (a === 'start') { history.replaceState(null, '', location.pathname); showBirth(makeConfig(newSeed(), S.birthMode)); }
  else if (a === 'resume') {
    const p = loadProgress(store, VERSION);
    if (!p) { showStart(); return; }
    S.replay = false;
    S.config = makeConfig(p.seed, p.birthMode, p.suppressFrom);
    S.card = birthCard(S.config, DATA);
    S.pendingAnswers = p.answers;
    S.fast = true;
    beginLife();
  }
  else if (a === 'begin') beginLife();
  else if (a === 'toggle') { if (S.player.state === 'paused') S.player.resume(); else S.player.pause(); renderControls(); }
  else if (a === 'speed') { const x = Number(b.dataset.value); S.player.setSpeed(x); setPref('8man.speed', x); renderControls(); }
  else if (a === 'skip') { handle(S.player.skipToDecision()); renderControls(); }
  else if (a === 'event-ok') closeEvent();
  else if (a === 'choose') choose(b.dataset.k);
  else if (a === 'auto') choose(undefined);
  else if (a === 'support-ok') { const next = S.supportNext; S.supportNext = null; next?.(); }
  else if (a === 'post') post();
  else if (a === 'save') saveImage();
  else if (a === 'again') { history.replaceState(null, '', location.pathname); showStart(); }
  else if (a === 'feedback') openFeedback();
  else if (a === 'fb-close') closeFeedback();
  else if (a === 'fb-send') sendFeedback(b);
  else if (a === 'fb-kind' && S.fb) {
    S.fb.kind = b.dataset.k;
    for (const x of document.querySelectorAll('[data-action="fb-kind"]')) x.setAttribute('aria-pressed', String(x === b));
  }
});

// 解説やプライバシーのページから「ご意見の窓口」（./#feedback）で来たら、最初の画面の上に板を出す
function openFeedbackFromHash() {
  history.replaceState(null, '', location.pathname);
  openFeedback();
}

// 再現リンクで開かれたら、その人生を出生届から（分かれ道は止まらずに、ふつうの速さで）見せる
function boot() {
  if (/[#&]s=/.test(location.hash)) {
    const r = decodeReplay(location.hash, VERSION);
    if (r.ok) { showBirth(makeConfig(r.seed, r.birthMode, r.suppressFrom), r.answers, false, true); return; }
    showStart(r.reason === 'version'
      ? '版が変わったため、このリンクの人生はそのままでは再現できません。新しく生まれてみてください。'
      : 'このリンクは形が正しくないため、人生を再現できませんでした。');
    return;
  }
  showStart();
  if (location.hash === '#feedback') openFeedbackFromHash();
}

// 同じページのまま再現リンクに移ったとき（# から後だけが変わったとき）も、その人生を開き直す
window.addEventListener('hashchange', () => {
  if (/[#&]s=/.test(location.hash)) boot();
  else if (location.hash === '#feedback') openFeedbackFromHash();
});

// 開いた人の数（Cloudflare Web Analytics）。読み込むかどうかは core/analytics.js が決める（トラッキング拒否なら読み込まない）
function loadAnalytics() {
  const b = analyticsBeacon(SITE, navigator, window);
  if (!b) return;
  const el = document.createElement('script');
  el.type = 'module'; // Cloudflare の貼り付け用の文と同じ読み込み方
  el.src = b.src;
  el.setAttribute('data-cf-beacon', b.beacon);
  document.head.appendChild(el);
}

boot();
loadAnalytics();
