import { sceneLayout } from './scene.js';
// 札の画像（縦長 1080×1350・名刺風・C カード）の文字と四角の配置。描くのは card.js（Canvas）。
// 文字の幅は「全角1・半角0.5」×文字の大きさで見積もり、どの文字も札の内側（60〜1020）に収める。
// 手で書いた文（ひとこと・振り返り）は使わない。
const W = 1080, H = 1350;
const X0 = 132, X1 = 948; // 中身の左右
const C = { ground: '#EEF1F5', card: '#FFFFFF', ink: '#1D2733', sub: '#4E5B6B', blue: '#2C5AA0', orange: '#B5521A', soft: '#F3F5F8' };
const NO_START = /[、。，．）」』！？・ー…]/;

export function textUnits(text) {
  let n = 0;
  for (const ch of String(text)) {
    const c = ch.codePointAt(0);
    n += c < 0x80 || (c >= 0xff61 && c <= 0xff9f) ? 0.5 : 1;
  }
  return n;
}

// 幅（全角の字数）で折り返す。句読点や閉じかっこで行を始めない（前の行の最後の字ごと次の行へ送る）
export function wrapText(text, maxUnits) {
  const lines = [];
  let cur = '';
  for (const ch of String(text)) {
    if (textUnits(cur + ch) <= maxUnits) { cur += ch; continue; }
    if (NO_START.test(ch) && [...cur].length > 1) {
      const chars = [...cur];
      const last = chars.pop();
      lines.push(chars.join(''));
      cur = last + ch;
    } else {
      lines.push(cur);
      cur = ch;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// 行の数が多すぎるときは、最後の行を「…」で切る
function fit(lines, maxLines, maxUnits) {
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && textUnits(`${last}…`) > maxUnits) last = [...last].slice(0, -1).join('');
  kept[maxLines - 1] = `${last}…`;
  return kept;
}

// 幅に収まる文字の大きさ（大きくても base）
const sizeFor = (text, width, base) => Math.min(base, Math.floor(width / Math.max(1, textUnits(text))));

function firstNum(m) {
  if (m.route === 'exam') return [`${m.passYears}年`, m.gradExempt ? 'そろうまで' : '合格まで'];
  if (m.route === 'tax-office') return [`${m.taxOfficeYears}年`, '税務署に勤めて'];
  if (m.route === 'cpa') return ['会計士', '公認会計士から'];
  return ['弁護士', '弁護士から'];
}

// handle：作者の X のアカウント名（あれば「作 Yasu@（@名前）」。札は画像でリンクにできないので名前で探せるようにする）
// scene：最期の場面（core/scene.js の sceneOf）。あれば大きな数字の下に、ドット絵を3倍（384×120）で入れる
// （4倍だと下の行が足りず、まれさの「（概算）」が切れた）
const SCENE = { x: 348, y: 654, scale: 3 };
function sceneItems(scene) {
  const { items } = sceneLayout(scene);
  return items.map(it => (it.kind === 'text'
    ? { kind: 'text', text: it.text, x: SCENE.x + it.x * SCENE.scale, y: SCENE.y + it.y * SCENE.scale, size: it.size * SCENE.scale, color: it.color, weight: 700, align: 'left', part: 'scene' }
    : { kind: 'rect', x: SCENE.x + it.x * SCENE.scale, y: SCENE.y + it.y * SCENE.scale, w: it.w * SCENE.scale, h: it.h * SCENE.scale, color: it.color, radius: 0, part: 'scene' }));
}

export function cardLayout(m, { handle = '', scene = null } = {}) {
  const items = [];
  const rect = (x, y, w, h, color, radius = 0) => items.push({ kind: 'rect', x, y, w, h, color, radius });
  const text = (t, x, y, size, color, weight = 500, align = 'left') => items.push({ kind: 'text', text: t, x, y, size, color, weight, align });

  rect(0, 0, W, H, C.ground);
  rect(60, 60, 960, 1230, C.card, 48);
  // 題の札と作者
  rect(X0, 128, 230, 64, C.blue, 32);
  text('8万分の1', X0 + 115, 172, 34, '#FFFFFF', 700, 'center');
  const author = handle ? `作 Yasu@（@${handle}）` : '作 Yasu@';
  text(author, X1, 172, sizeFor(author, X1 - (X0 + 260), 30), C.sub, 500, 'right');
  // 丸と名前
  const given = m.given ?? m.name;
  rect(X0, 240, 140, 140, C.blue, 70);
  text([...given][0] ?? '', X0 + 70, 335, 64, '#FFFFFF', 700, 'center');
  const display = m.surname ? `${m.surname} ${m.given}` : m.name;
  text(display, 300, 300, sizeFor(display, X1 - 300, 64), C.ink, 700);
  const meta = `${m.birthYear}年 ${m.pref}生まれ · ${m.deathAge}歳`;
  text(meta, 300, 360, sizeFor(meta, X1 - 300, 32), C.sub);
  // 大きな数字3つ
  const [n1, l1] = firstNum(m);
  const nums = [[n1, l1, C.blue], [`${m.clientsMax}件`, '顧問先の最多', C.blue], [`${m.deathAge}歳`, m.causeLabel, C.orange]];
  nums.forEach(([v, l, color], i) => {
    const x = X0 + i * (256 + 24);
    rect(x, 430, 256, 200, C.soft, 28);
    text(v, x + 128, 545, sizeFor(v, 230, 60), color, 700, 'center');
    text(l, x + 128, 598, sizeFor(l, 230, 28), C.sub, 500, 'center');
  });
  // 最期の場面（最後の暮らし）
  if (scene) {
    rect(SCENE.x - 10, SCENE.y - 10, 128 * SCENE.scale + 20, 40 * SCENE.scale + 20, C.soft, 24);
    items.push(...sceneItems(scene));
  }
  // 科目の順・働いた所・同期（場面があれば、その下から）
  let y = scene ? SCENE.y + 40 * SCENE.scale + 48 : 712;
  // 入る行の数は (BOTTOM − y) ÷ 行の高さ。場面ありでは最後の行の線が 1190 まで下りられる（#8万分の1 の字の上 1200 に届かない）
  const BOTTOM = scene ? 1236 : 1150;
  const VALUE_X = 300, SIZE = 32, LINE = 46, UNITS = Math.floor((X1 - VALUE_X) / SIZE);
  const rare = m.rarity ? `全国の税理士8万2,513人のうち、${m.pref}生まれで同じ道・同じ性別の人はおよそ${m.rarity.count.toLocaleString('ja-JP')}人（概算）` : '';
  const rows = [['科目の順', m.subjectLine], ['働いた所', m.workLine], ['同期4人', m.peerSummary ?? ''], ...(rare ? [['まれさ', rare]] : [])];
  rows.forEach(([label, value], i) => {
    const room = Math.max(1, Math.floor((BOTTOM - y) / LINE) - (rows.length - 1 - i));
    const lines = fit(wrapText(value, UNITS), Math.min(3, room), UNITS);
    text(label, X0, y, 30, C.sub);
    lines.forEach((l, k) => text(l, VALUE_X, y + k * LINE, SIZE, C.ink));
    y += lines.length * LINE + (scene ? 14 : 22);
  });
  // 場面ありでは行が下まで来るので、#8万分の1 を少し下げて間を空ける
  text('#8万分の1', X0, scene ? 1252 : 1232, 32, C.blue, 700);
  return { width: W, height: H, items };
}
