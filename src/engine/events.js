// 出来事のしくみ。文そのものに年齢・暦年・立場・前提を持たせ、出す前に絞る（日本版の不具合を繰り返さない）。
// 出来事の形：{ id, ages:[a0,a1], years?:[y0,y1], roles?, needs?(s,ctx), p(s,ctx), gap?, kind?,
//   texts?: (string | (s,ctx)=>string | {text, needs?(s,ctx)})[], fx?: {hl,h,sm,so}, fxClients?, fxFlag?, fxHabit?, fact?, run?(s,ctx) => null | {lines, apply?(s)} }
// gap がない出来事は一生に1回だけ。gap があっても、この人生でまだ出していない文から選び、出し終えたら起こさない。
import { renderText } from './text.js';
import { rolesOf } from './year.js';
import { clamp } from './odds.js';

export function applyFx(s, fx) {
  if (!fx) return;
  for (const k of ['hl', 'h', 'sm', 'so']) if (fx[k]) s.stats[k] = clamp(s.stats[k] + fx[k], 0, 100);
}

export function eligibleEvents(events, s, ctx) {
  const roles = rolesOf(s, ctx.year);
  return events.filter(ev => {
    if (s.age < ev.ages[0] || s.age > ev.ages[1]) return false;
    if (ev.years && (ctx.year < ev.years[0] || ctx.year > ev.years[1])) return false;
    if (ev.roles && !ev.roles.some(r => roles.includes(r))) return false;
    if (ev.rare && (s.rareCount ?? 0) >= 3) return false;
    if (!ev.run && ev.texts?.every(t => { const x = typeof t === 'string' ? t : t?.text; return typeof x === 'string' && s.usedTexts.has(x); })) return false;
    const last = s.lastSeen.get(ev.id);
    if (last !== undefined && (ev.gap === undefined || s.age - last < ev.gap)) return false;
    if (ev.needs && !ev.needs(s, ctx)) return false;
    return true;
  });
}

// その年に起こる出来事を選ぶ。まず各出来事を確率 p で起こし、多すぎれば p の重みで n 件に絞る。
export function drawEvents(eligible, s, ctx, n) {
  const hit = eligible.filter(ev => ctx.rng() < Math.min(1, ev.p(s, ctx)));
  const out = [];
  const pool = hit.map(ev => ({ ev, w: Math.max(1e-6, ev.p(s, ctx)) }));
  while (out.length < n && pool.length) {
    const total = pool.reduce((a, b) => a + b.w, 0);
    let r = ctx.rng() * total, i = 0;
    while (i < pool.length - 1 && (r -= pool[i].w) >= 0) i++;
    out.push(pool.splice(i, 1)[0].ev);
  }
  return out;
}

const toLine = (s, ctx, l) => {
  const line = { age: s.age, year: ctx.year, t: ctx.t, kind: l.kind ?? 'ev', text: l.text };
  if (l.fact) line.fact = l.fact;
  if (l.source) line.source = l.source;
  return line;
};

export function fireEvent(ev, s, ctx) {
  // 珍しい出来事は1人生に3件まで（同じ年に2件引かれても、出す直前に確かめる）
  if (ev.rare && (s.rareCount ?? 0) >= 3) return [];
  let res;
  if (ev.run) res = ev.run(s, ctx);
  else if (ev.texts?.length) {
    const order = ev.texts.map((_, i) => i);
    let text = null;
    while (order.length && text == null) {
      const x = renderText(ev.texts[order.splice(Math.floor(ctx.rng() * order.length), 1)[0]], s, ctx);
      if (x && !s.usedTexts.has(x)) text = x;
    }
    res = text ? { lines: [{ kind: ev.kind, text, fact: ev.fact }], apply: st => {
      st.usedTexts.add(text);
      applyFx(st, ev.fx);
      if (ev.fxClients) st.career.clients = Math.max(0, st.career.clients + ev.fxClients);
      if (ev.fxFlag) st.flags.add(ev.fxFlag);
      if (ev.fxHabit) Object.assign(st.habits, ev.fxHabit);
      if (ev.rare) st.rareCount = (st.rareCount ?? 0) + 1;
    } } : null;
  }
  if (!res || !res.lines?.length) return [];
  res.apply?.(s);
  s.lastSeen.set(ev.id, s.age);
  return res.lines.map(l => ({ ...toLine(s, ctx, l), ev: ev.id }));
}
