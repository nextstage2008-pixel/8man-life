// 家族・健康・心。結婚は初婚年齢と50歳で未婚の割合に合わせて較正する。
// 名前は家族の中で重ならない（usedNames）。孫は、子が結婚したあとにだけ生まれる。
import { sayFresh } from './text.js';
import { monthT } from './calendar.js';
import { randInt, pickWeighted, normal } from './rng.js';
import { clamp } from './odds.js';
import { buildLifeTable } from './life-table.js';
import { pickName } from './birth.js';
import { FAMILY_TEXTS as T } from '../data/events/family.js';
import { MARRY, SMOKE, DRINK, EXERCISE, MENTAL, MENTAL_AGAIN } from '../data/decisions/life.js';
import { RENAI } from '../data/decisions/turning.js';
import { applyMoneyOps } from './money.js';

const ln = (text, kind = 'ev') => ({ kind, text });
const say = sayFresh;
// 出会いから結婚に進む割合：付き合う（おまかせ80%）×付き合った人が結婚に進む割合（結婚の話は翌年から毎年・「結婚する」88%・別れは年15%で、およそ98%）。50歳で未婚の割合の較正に使う
const ACCEPT = 0.78;
// 出会いの起こりやすさの中心は初婚年齢の平均より0.4歳上（付き合ってから結婚まで1年あまりかかるので、結婚の年齢は平均に近くなる。較正で決めた）
const MU = -0.4, SIGMA = 6;

// 年齢ごとの結婚の起こりやすさ h(a) = k·exp(−((a−μ)/σ)²/2)。50歳で未婚の割合に合うよう k を二分探索で決める
const hazardK = new Map();
function marryHazard(age, sex, data, era) {
  const L = data.LIFE[era];
  const mu = L.firstMarriageAge[sex].value - MU;
  const key = `${era}-${sex}-${mu}`;
  if (!hazardK.has(key)) {
    const target = L.neverMarriedAt50[sex].value;
    let lo = 0, hi = 1;
    for (let i = 0; i < 50; i++) {
      const k = (lo + hi) / 2;
      let never = 1;
      for (let a = 18; a < 50; a++) never *= 1 - ACCEPT * Math.min(0.95, k * Math.exp(-0.5 * ((a - mu) / SIGMA) ** 2));
      if (never > target) lo = k; else hi = k;
    }
    hazardK.set(key, (lo + hi) / 2);
  }
  return Math.min(0.95, hazardK.get(key) * Math.exp(-0.5 * ((age - mu) / SIGMA) ** 2));
}

const tables = new Map();
export function qFor(sex, age, data, era) {
  const L = data.LIFE[era];
  const e0 = L.e0[sex].value;
  const key = `${era}-${sex}-${e0}`;
  if (!tables.has(key)) tables.set(key, buildLifeTable({ e0, infant: L.infantMortality.value, sex }));
  return tables.get(key)[Math.min(110, Math.max(0, age))];
}

const married = s => !!(s.spouse && s.spouse.alive && !s.spouse.divorced);
const marriages = s => (s.family = s.family ?? { marriages: [] }).marriages;
const femaleAgeOfCouple = s => (s.sex === 'female' ? s.age : s.age + (s.spouse.birthYearSelf - s.spouse.birthYear));

function preparePartner(s, ctx) {
  const sex = s.sex === 'male' ? 'female' : 'male';
  const offset = clamp(Math.round(normal(ctx.rng, s.sex === 'male' ? 2 : -2, 3)), -10, 12); // 夫が少し年上
  const birthYear = s.birthYear + offset;
  return { sex, birthYear, birthYearSelf: s.birthYear, name: pickName(ctx.rng, sex, birthYear, s.usedNames), alive: true };
}

function marry(s, ctx, partner) {
  s.spouse = { ...partner, marriedAt: s.age };
  marriages(s).push({ from: s.age, to: null, end: null, name: partner.name });
  // 子どもの人数は、結婚の翌年に分かれ道で決める（data/decisions/turning.js の KODOMO）
  s.childTarget = null;
  s.dating = null;
  s.nextChildAge = s.age + randInt(ctx.rng, 1, 3);
  return [ln(say(T.marry, s, ctx, { _name: partner.name }), 'big')];
}

function endMarriage(s, kind) {
  const m = marriages(s).at(-1);
  if (m && m.to == null) { m.to = s.age; m.end = kind; }
  if (kind === 'death') { s.spouse.alive = false; s.widowedAt = s.age; }
  if (kind === 'divorce') s.spouse.divorced = true;
}

export const LIFE_SYSTEM = {
  id: 'life',
  plan(s, ctx) {
    const items = [];
    // 習慣の分かれ道（決まった年齢）
    // たばこは全員に、お酒は4割、運動は35%の人に聞く（分かれ道の数を25〜30回に保つため）
    const ASK = { smoke: 1, drink: 0.4, exercise: 0.35 };
    for (const d of [SMOKE, DRINK, EXERCISE]) if (s.age === d.ages[0] && !s.decisionCounts.has(d.id) && ctx.rng() < ASK[d.id]) items.push({ t: monthT(6), type: 'decision', ref: d });
    // 心の不調
    if (s.mentalPending) {
      s.mentalPending = false;
      items.push({ t: monthT(3), type: 'decision', ref: MENTAL });
    } else if (s.mental?.k === 'alone' && s.age - s.mental.since >= 2 && !s.decisionCounts.has('mental-again')) {
      items.push({ t: monthT(3), type: 'decision', ref: MENTAL_AGAIN });
    }
    // 恋愛と結婚。出会い（統計の起こりやすさで来る）→ 付き合う → 1年以上たって結婚の話。離婚・死別のあとは再婚の出会いが少し来る
    const single = !married(s);
    if (single && s.age >= 18 && s.age <= 60) {
      if (s.dating) {
        const partner = s.dating.partner;
        if (s.age >= s.dating.since + 1) items.push({ t: monthT(5), type: 'decision', ref: {
          ...MARRY,
          build: st => MARRY.build(Object.assign(Object.create(st), { _partner: partner.name })),
          apply: (k, st, cx) => (k === 'yes' ? { lines: marry(st, cx, partner) } : MARRY.apply(k)),
        } });
      } else {
        const h = s.spouse ? (s.age < 60 ? 0.04 : 0) : marryHazard(s.age, s.sex, ctx.data, s.era);
        if (ctx.rng() < h) {
          const partner = preparePartner(s, ctx);
          items.push({ t: monthT(5), type: 'decision', ref: {
            ...RENAI,
            build: st => RENAI.build(Object.assign(Object.create(st), { _partner: partner.name })),
            apply: (k, st, cx) => ({ ...RENAI.apply(k, st, cx), apply: st2 => { if (k === 'yes') st2.dating = { partner, since: st2.age }; } }),
          } });
        }
      }
    }
    return items;
  },
  end(s, ctx) {
    const out = [];
    const { data } = ctx;
    // 学校を出て、志すより前に働き始める人の就職の行（高校を出て就職を選んだ人は分かれ道で出ている）
    const school = s.flags.has('will-univ') ? 'univ' : s.flags.has('boki1') ? 'senmon' : 'kou';
    const schoolEnd = { univ: 22, senmon: 20, kou: 18 }[school];
    if (s.age === schoolEnd && s.aspireAge > s.age && s.career.phase === 'pre' && !s.flags.has('shushoku')) {
      s.flags.add('shushoku');
      out.push(ln(say(T.firstJob[school === 'univ' && s.career.companyKind === 'kanko' ? 'univKanko' : school], s, ctx)));
    }
    // 付き合っている人と別れることもある（推定）
    if (s.dating && s.age > s.dating.since && ctx.rng() < data.MONEY.turning.value.breakup) {
      out.push(ln(`${s.dating.partner.name}と別れました。`, 'loss'));
      s.dating = null;
    }
    // 子が生まれる
    if (married(s) && s.childTarget > s.children.length && s.age >= s.nextChildAge && femaleAgeOfCouple(s) <= 42) {
      const sex = ctx.rng() < 0.512 ? 'male' : 'female';
      const birthYear = s.birthYear + s.age;
      const child = { name: pickName(ctx.rng, sex, birthYear, s.usedNames), sex, bornAge: s.age, birthYear, married: false, alive: true };
      s.children.push(child);
      s.nextChildAge = s.age + randInt(ctx.rng, 2, 4);
      out.push(ln(say(T.childBorn, s, ctx, { _name: child.name }), 'warm'));
    }
    // 子が結婚し、孫が生まれる
    for (const c of s.children) {
      const ca = s.age - c.bornAge;
      if (!c.married && ca >= 25 && ca <= 40 && ctx.rng() < 0.1) {
        c.married = true; c.marriedAt = ca; c.kids = Number(pickWeighted(ctx.rng, { 0: 15, 1: 35, 2: 40, 3: 10 })); c.nextKid = ca + randInt(ctx.rng, 1, 3);
        out.push(ln(say(T.childMarry, s, ctx, { _name: c.name }), 'warm'));
      }
      if (c.married && c.kids > 0 && ca >= c.nextKid && ca <= 42) {
        const sex = ctx.rng() < 0.512 ? 'male' : 'female';
        const birthYear = s.birthYear + s.age;
        const g = { name: pickName(ctx.rng, sex, birthYear, s.usedNames), sex, bornAge: s.age, parent: c.name };
        s.grandchildren.push(g);
        c.kids -= 1; c.nextKid = ca + randInt(ctx.rng, 2, 4);
        out.push(ln(say([T.grandBorn[s.grandchildren.length === 1 ? 1 : 0]], s, ctx, { _name: g.name }), 'warm'));
      }
    }
    // 親が亡くなる
    for (const p of s.parents) {
      if (!p.alive) continue;
      const age = p.age + s.age;
      if (age >= 110 || ctx.rng() < qFor(p.role === 'father' ? 'male' : 'female', age, data, s.era)) {
        p.alive = false;
        out.push(ln(say(T.parentDie, s, ctx, { _who: p.role === 'father' ? '父' : '母', _name: p.name }), 'loss'));
      }
    }
    // 配偶者が亡くなる・離婚
    if (married(s)) {
      const sAge = s.age + (s.birthYear - s.spouse.birthYear);
      if (sAge >= 110 || ctx.rng() < qFor(s.spouse.sex, sAge, data, s.era)) {
        endMarriage(s, 'death');
        out.push(ln(say(T.spouseDie, s, ctx, { _name: s.spouse.name }), 'loss'));
      } else if (ctx.rng() < (s.age - s.spouse.marriedAt < 20 ? 0.007 : 0.003)) {
        endMarriage(s, 'divorce');
        out.push(ln(say(T.divorce, s, ctx, { _name: s.spouse.name }), 'loss'));
        applyMoneyOps(s, [{ op: 'spend', amount: data.MONEY.shocks.value.divorce, reason: 'divorce' }], data);
      }
    }
    // 病気（40歳から。たばこ・飲酒・運動・健康で起こりやすさが変わる。推定）
    if (s.age >= 40 && s.illnesses.length < 2) {
      let p = 0.0016 * Math.exp(0.065 * (s.age - 40));
      if (s.habits.smoke) p *= 1.8;
      if (s.habits.drink) p *= 1.3;
      if (s.habits.exercise) p *= 0.85;
      if (s.stats.hl < 50) p *= 1.3;
      if (s.flags.has('kenshin')) p *= 0.8;
      if (ctx.rng() < p) {
        const type = pickWeighted(ctx.rng, { cancer: 60, heart: 22, stroke: 18 });
        s.illnesses.push({ type, age: s.age });
        out.push(ln(say(T.ill[type], s, ctx), 'bad'));
        applyMoneyOps(s, [{ op: 'spend', amount: data.MONEY.shocks.value.illness, reason: 'illness' }], data);
      }
    }
    // 心の不調：起こりやすさ（推定）。忙しく幸福が低いとき、別れのあと
    if (s.mental) {
      const rec = { consult: 0.7, tell: 0.55, alone: 0.3 }[s.mental.k];
      if (s.age > s.mental.since && ctx.rng() < rec) { s.mental = null; out.push(ln(say(T.mentalRecover, s, ctx), 'warm')); }
    } else if (s.age >= 18 && s.age <= 80) {
      let p = 0.012;
      if (s.flags.has('busy-year') && s.stats.h < 45) p += 0.03;
      if (s.widowedAt != null && s.age - s.widowedAt <= 2) p += 0.05;
      if (ctx.rng() < p) { s.mentalPending = true; out.push(ln(say(T.mentalStart, s, ctx), 'bad')); }
    }
    return out;
  },
};
