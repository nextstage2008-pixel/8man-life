// 決まった場面の文の選び方。候補から、この人生でまだ出していない文を選ぶ。
// 全部出し終えていたら、候補の中からくじで選ぶ（毎年の受験の行など、回数の多い場面のため）。
export function sayFresh(arr, s, ctx, vars = {}) {
  const view = Object.assign(Object.create(s), vars);
  const order = arr.map((_, i) => i);
  let first = null;
  while (order.length) {
    const f = arr[order.splice(Math.floor(ctx.rng() * order.length), 1)[0]];
    const text = typeof f === 'function' ? f(view, ctx) : f;
    if (first == null) first = text;
    if (!s.usedTexts.has(text)) { s.usedTexts.add(text); return text; }
  }
  return first;
}

// 本人が顧問先を持つことを表す言い回し（「顧問の税理士」「受かったら顧問を頼みたい」など相手側の顧問は含めない）
export const KOMON_RE = /顧問先|顧問料|顧問を(頼まれ|引き受け)|顧問の(依頼|見積|話)|顧問になり/;

// 顧問先を持てる人：開業・所属・社員の税理士（企業内税理士を除く）、会計事務所で働く受験生、弁護士、顧問先を持っていた引退した人
export function komonOK(s) {
  const c = s.career;
  if (c.phase === 'lawyer') return true;
  if (c.phase === 'registered') return c.workStyle !== 'kigyonai';
  if (c.phase === 'retired') return (c.workHistory ?? []).some(h => h.style !== 'kigyonai' && h.style !== 'retired');
  return s.route === 'exam' && c.job === 'jimusho';
}

// 文ごとの決まり：顧問先を持たない人に顧問先の文を、予備校に通っていない受験生に予備校の文を出さない
export function textAllowed(text, s) {
  if (KOMON_RE.test(text) && !komonOK(s)) return false;
  if (/予備校/.test(text) && s.route === 'exam' && s.career.method !== 'yobiko') return false;
  return true;
}

// 文の候補1つを、その人の文にする。候補は 文字列・関数・{ text, needs }。出せないときは null
export function renderText(t, s, ctx) {
  if (t && typeof t === 'object') {
    if (t.needs && !t.needs(s, ctx)) return null;
    t = t.text;
  }
  const x = typeof t === 'function' ? t(s, ctx) : t;
  return x && textAllowed(x, s) ? x : null;
}
