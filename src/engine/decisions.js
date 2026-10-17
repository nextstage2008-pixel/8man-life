// 分かれ道のしくみ。題・本文・出典つきの事実・選択肢（ヒントつき）・結果の処理で作る。
// 分かれ道の形：{ id, ages?, years?, roles?, needs?, when(s,ctx), build(s,ctx), auto, apply(k,s,ctx),
//   remember?, certainSkip?(s,ctx), maxPerLife?（既定1）, gap? }
// 1年に画面に出る分かれ道は2件まで。答えのあとの乱数は (種, 'd', 年齢, 何番目, 答え) で作り直す。
import { createRng, deriveSeed, pickWeighted } from './rng.js';
import { rolesOf } from './year.js';

const MAX_PER_YEAR = 2;

export function autoChooser(view, weights, rng) {
  const w = Object.fromEntries(view.choices.map(c => [c.k, Math.max(0.05, weights?.[c.k] ?? 1)]));
  return pickWeighted(rng, w);
}

export function eligibleDecisions(decisions, s, ctx) {
  const roles = rolesOf(s, ctx.year);
  return decisions.filter(d => {
    if (d.ages && (s.age < d.ages[0] || s.age > d.ages[1])) return false;
    if (d.years && (ctx.year < d.years[0] || ctx.year > d.years[1])) return false;
    if (d.roles && !d.roles.some(r => roles.includes(r))) return false;
    if ((s.decisionCounts.get(d.id) ?? 0) >= (d.maxPerLife ?? 1)) return false;
    const last = s.lastSeen.get(`d:${d.id}`);
    if (last !== undefined && d.gap !== undefined && s.age - last < d.gap) return false;
    if (d.needs && !d.needs(s, ctx)) return false;
    return true;
  });
}

// 決まった行事の分かれ道（仕組みが置いたもの）と合わせて、1年に2件までにする
export function pickDecisions(s, ctx, items) {
  const room = MAX_PER_YEAR - items.filter(i => i.type === 'decision').length;
  if (room <= 0) return [];
  const cands = eligibleDecisions(ctx.world.decisions, s, ctx).filter(d => d.when(s, ctx));
  const out = [];
  const ts = [0.3, 0.6];
  while (out.length < room && cands.length) {
    const d = cands.splice(Math.floor(ctx.rng() * cands.length), 1)[0];
    out.push({ t: ts[out.length] + ctx.rng() * 0.05, type: 'decision', ref: d });
  }
  return out;
}

const weightsOf = (d, s, ctx) => (typeof d.auto === 'function' ? d.auto(s, ctx) : d.auto);

export function* askDecision(d, s, ctx) {
  const built = d.build(s, ctx);
  const view = { id: d.id, age: s.age, year: ctx.year, birthYear: s.birthYear, title: built.title, body: built.body, choices: built.choices };
  if (built.fact) view.fact = built.fact;
  if (built.kind) view.kind = built.kind;
  // 画面のため：その年の中の時刻（この時刻に分かれ道の板を出す）と、振り返りの記入欄の印
  view.t = ctx.t;
  if (built.input) view.input = true;
  const valid = k => built.choices.some(c => c.k === k);
  const asked = ctx.ask.decisions;
  let k, shown = false, remembered = false;
  if (d.remember && s.remembered.has(d.id) && valid(s.remembered.get(d.id))) {
    k = s.remembered.get(d.id);
    remembered = true;
  } else {
    const skip = d.certainSkip?.(s, ctx);
    if (skip != null && valid(skip)) k = skip;
    else {
      shown = true;
      if (ctx.ask.choices) k = ctx.ask.choices.length ? ctx.ask.choices.shift() : undefined;
      else k = yield { kind: 'decision', view };
      // おまかせは専用の乱数で引く（その年の乱数を使うと、答えの列で回し直したときに後がずれる）
      if (!valid(k)) k = autoChooser(view, weightsOf(d, s, ctx), createRng(deriveSeed(s.seed, 'auto', s.age, asked.length)));
    }
  }
  const index = asked.length;
  if (shown) asked.push({ id: d.id, age: s.age, k });
  const rng = createRng(deriveSeed(s.seed, 'd', s.age, index, k));
  const usedBefore = new Set(s.usedTexts);
  const res = d.apply(k, s, { ...ctx, rng }) ?? { lines: [] };
  res.apply?.(s);
  s.decisionCounts.set(d.id, (s.decisionCounts.get(d.id) ?? 0) + 1);
  s.lastSeen.set(`d:${d.id}`, s.age);
  if (d.remember) s.remembered.set(d.id, k);
  const label = built.choices.find(c => c.k === k)?.label ?? k;
  const head = remembered
    ? { kind: 're', text: `（${built.title}：前と同じく「${label}」）` }
    : { kind: 'dec', text: `${built.title}：「${label}」` };
  // 同じ分かれ道で前と同じ結果になったときは、言い回しを変える（「今回も、」）。ひと息の行はそのまま
  const fresh = l => {
    if (l.kind === 'reflect') return l;
    for (const t of [l.text, `今回も、${l.text}`, `このときも、${l.text}`]) if (!usedBefore.has(t)) { usedBefore.add(t); s.usedTexts.add(t); return { ...l, text: t }; }
    return l;
  };
  return [head, ...(res.lines ?? []).map(fresh)].map(l => ({ age: s.age, year: ctx.year, t: ctx.t, kind: l.kind ?? 'ev', text: l.text, ...(l.fact ? { fact: l.fact } : {}) }));
}
