// 数年続く物語。段階ごとに年数をあけて進む。同時に進むのは2本まで、新しく始まるのは1年に1本まで。
// 途中で亡くなったら止まる（仕組みの end は生きているときだけ呼ばれる）。
import { randInt } from './rng.js';
import { renderText } from './text.js';
import { ARCS } from '../data/events/arcs.js';

const MAX_ACTIVE = 2;

function runStep(s, ctx, def, rec) {
  const step = def.steps[rec.step];
  // 段の前提と文ごとの前提を、その年の状態で確かめ直す（親を見送ったあとに介護の段が出ない、など）
  const ok = !step.needs || step.needs(s, ctx);
  const cands = ok ? step.texts.map(t => renderText(t, s, ctx)).filter(x => x && !s.usedTexts.has(x)) : [];
  if (!cands.length) { rec.done = true; rec.closed = true; return null; }
  const text = cands[Math.floor(ctx.rng() * cands.length)];
  s.usedTexts.add(text);
  step.apply?.(s, ctx);
  rec.steps.push({ step: rec.step, age: s.age });
  const line = { kind: 'ev', text, ev: `arc:${def.id}` };
  if (Array.isArray(step.next)) rec.nextAge = s.age + randInt(ctx.rng, step.next[0], step.next[1]);
  else { rec.done = true; s.arcsDone.add(def.id); }
  rec.step += 1;
  if (rec.step >= def.steps.length) { rec.done = true; s.arcsDone.add(def.id); }
  return line;
}

export const ARC_SYSTEM = {
  id: 'arcs',
  end(s, ctx) {
    s.arcLog = s.arcLog ?? [];
    s.arcsDone = s.arcsDone ?? new Set();
    const out = [];
    for (const rec of s.arcLog) {
      if (rec.done || rec.nextAge !== s.age) continue;
      const line = runStep(s, ctx, ARCS.find(a => a.id === rec.id), rec);
      if (line) out.push(line);
    }
    const active = s.arcLog.filter(r => !r.done);
    if (active.length < MAX_ACTIVE) {
      for (const def of ARCS) {
        if (s.age < def.ages[0] || s.age > def.ages[1]) continue;
        if (s.arcsDone.has(def.id) || active.some(r => r.id === def.id)) continue;
        if (def.needs && !def.needs(s, ctx)) continue;
        if (ctx.rng() >= def.p) continue;
        const rec = { id: def.id, step: 0, steps: [], done: false, nextAge: null };
        const line = runStep(s, ctx, def, rec);
        if (!line) continue;
        s.arcLog.push(rec);
        out.push(line);
        break;
      }
    }
    return out;
  },
};
