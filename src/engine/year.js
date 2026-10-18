// 1年の進め方。年の初めに予定を組み（planYear）、年の終わりに数値・お金・家族・死亡を処理する（endYear）。
// 道ごとの流れや家族は world.systems に差し込む：{ id, plan?(s, ctx) => Item[], end?(s, ctx) => LogLine[] }
import { textAllowed } from './text.js';
import { calendarYear, monthT } from './calendar.js';
import { clamp } from './odds.js';
import { pickWeighted } from './rng.js';
import { buildLifeTable } from './life-table.js';
import { eligibleEvents, drawEvents } from './events.js';
import { updateMoney, moneyMood, incomeOf, settleAtDeath } from './money.js';

const PRE_PHASE_ROLES = ['aspirant', 'examinee', 'tax-office', 'cpa-exam', 'cpa', 'law-exam', 'lawyer'];
const WORK_ROLE = { shozoku: 'employed', kigyonai: 'employed', shain: 'partner', kaigyo: 'owner' };

export function schoolEndAge(s) {
  return s.schoolEndAge ?? (s.flags.has('will-univ') ? 22 : 18);
}

export function rolesOf(s, year) {
  if (s.age < 6) return ['child'];
  const roles = [];
  if (s.age < schoolEndAge(s)) roles.push('student');
  const ph = s.career.phase;
  if (PRE_PHASE_ROLES.includes(ph)) roles.push(ph);
  if (ph === 'registered') {
    roles.push(WORK_ROLE[s.career.workStyle] ?? 'employed');
    if (s.route === 'cpa') roles.push('cpa-zeirishi');
    if (s.route === 'lawyer') roles.push('lawyer');
  }
  if (ph === 'retired') roles.push('retired');
  return roles;
}

export const isRegistered = s => s.career.phase === 'registered' || s.career.phase === 'retired';

export function planYear(s, data, rng, world) {
  const year = calendarYear(s.birthYear, s.age);
  const ctx = { rng, year, age: s.age, data, t: 0, world };
  const items = [];
  for (const sys of world.systems) if (sys.plan) items.push(...sys.plan(s, ctx));
  for (const h of data.HISTORY) if (h.year === year) items.push({ t: h.month ? monthT(h.month) : 0.5, type: 'history', ref: h });
  const n = s.age < 6 ? 2 : 3;
  const pool = eligibleEvents(world.events, s, ctx);
  const drawn = drawEvents(pool.filter(ev => !ev.flavor), s, ctx, n);
  // 出来事が1つも起きなかった年は、年齢と立場に合う何も起きない年の一行を1つだけ出す
  if (!drawn.length) {
    const quiet = pool.filter(ev => ev.flavor);
    if (quiet.length) drawn.push(quiet[Math.floor(rng() * quiet.length)]);
  }
  for (const ev of drawn) items.push({ t: 0.08 + rng() * 0.86, type: 'event', ref: ev });
  if (world.pickDecisions) items.push(...world.pickDecisions(s, ctx, items));
  return items.map((it, i) => ({ ...it, i })).sort((a, b) => a.t - b.t || a.i - b.i);
}

// 年表の行：本人の立場の文、なければ any の文
export function historyLine(h, s, year) {
  const roles = rolesOf(s, year);
  const key = roles.find(r => h.texts[r] && textAllowed(h.texts[r], s)) ?? (h.texts.any && textAllowed(h.texts.any, s) ? 'any' : null);
  if (!key) return null;
  const line = { age: s.age, year, t: h.month ? monthT(h.month) : 0.5, kind: h.kind === 'seido' ? 'big' : 'ev', text: h.texts[key], source: 'history' };
  if (h.fact && h.fact.src !== 'imagined') line.fact = h.fact;
  if (h.imagined) line.imagined = true;
  return line;
}

// 数値の目標。毎年少しずつ近づける（健康25%・人間関係15%・幸福は下がるとき35%・上がるとき20%）。
function targets(s, data) {
  const a = s.age;
  let hl = a < 30 ? 90 : 90 - 0.7 * (a - 30);
  if (s.habits.smoke) hl -= 6;
  if (s.habits.drink) hl -= 3;
  if (s.habits.exercise) hl += 3;
  hl -= 5 * s.illnesses.length;
  if (s.flags.has('busy-year')) hl -= 4;
  let so = 45 + (s.spouse?.alive ? 12 : 0) + Math.min(15, 4 * s.children.length) + (s.parents.find(p => p.role === 'mother')?.alive ? 3 : 0);
  if (a >= 13 && a <= 19) so -= 5;
  if (s.flags.has('lonely')) so -= 10;
  let h = 50 + (s.stats.so - 50) * 0.35 + (s.stats.hl - 60) * 0.2 + (isRegistered(s) ? 6 : 0);
  if (s.mental) h -= 12;
  h += moneyMood(s, data);
  return { hl: clamp(hl, 5, 95), so: clamp(so, 5, 95), h: clamp(h, 5, 95) };
}

function updateStats(s, data) {
  const tg = targets(s, data);
  s.stats.hl = clamp(s.stats.hl + (tg.hl - s.stats.hl) * 0.25, 0, 100);
  s.stats.so = clamp(s.stats.so + (tg.so - s.stats.so) * 0.15, 0, 100);
  const k = tg.h < s.stats.h ? 0.35 : 0.2;
  s.stats.h = clamp(s.stats.h + (tg.h - s.stats.h) * k, 0, 100);
  s.flags.delete('busy-year');
}

const tables = new Map();
function lifeTableFor(s, data) {
  const key = `${s.era}-${s.sex}`;
  if (!tables.has(key)) {
    const L = data.LIFE[s.era];
    tables.set(key, buildLifeTable({ e0: L.e0[s.sex].value, infant: L.infantMortality.value, sex: s.sex }));
  }
  return tables.get(key);
}

export function causeFor(age, data, era, rng) {
  const bin = data.LIFE[era].causeByAge.find(b => age >= b.from && age <= b.to) ?? data.LIFE[era].causeByAge.at(-1);
  return pickWeighted(rng, bin.causes);
}

export function die(s, cause, ctx, data) {
  s.alive = false;
  s.deathAge = s.age;
  s.deathCause = cause;
  return [{ kind: 'loss', text: `${s.age}歳で、${data.CAUSES[cause].label}のため亡くなりました。` }, ...settleAtDeath(s, data)].map(l => ({ age: s.age, year: ctx.year, t: 0.97, ...l }));
}

// 死亡の判定。本人は必ず登録まで届くので、登録の前は判定しない（110歳で必ず亡くなる）。
export function defaultDeath(s, ctx) {
  const { data } = ctx;
  if (!isRegistered(s) && s.age < 110) return [];
  const q = lifeTableFor(s, data)[Math.min(110, s.age)];
  if (s.age >= 110 || ctx.rng() < q) return die(s, causeFor(s.age, data, s.era, ctx.rng), ctx, data);
  return [];
}

export function endYear(s, data, rng, world) {
  const year = calendarYear(s.birthYear, s.age);
  const ctx = { rng, year, age: s.age, data, t: 0.96, world };
  const lines = [];
  updateStats(s, data);
  for (const sys of world.systems) if (sys.end && s.alive) lines.push(...sys.end(s, ctx).map(l => ({ age: s.age, year, t: 0.96, ...l, kind: l.kind ?? 'ev' })));
  // お金：その年の年収が決まってから（仕事の仕組みの end のあと）、手取り・暮らし・返済・貯蓄（engine/money.js）
  if (s.alive) s.money.income = incomeOf(s, data);
  if (s.alive) lines.push(...updateMoney(s, data).map(l => ({ age: s.age, year, t: 0.96, ...l, kind: l.kind ?? 'ev' })));
  if (s.alive) lines.push(...(world.death ?? defaultDeath)(s, ctx));
  if (s.alive) s.age += 1;
  return lines;
}
