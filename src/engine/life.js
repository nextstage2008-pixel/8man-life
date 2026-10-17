// 人生全体を進める generator。行と分かれ道を順に yield し、分かれ道の答えは next(k) で受け取る。
// 画面（段階2）・おまかせ（runAuto）・サーバーでの計算し直し（段階3）が同じものを使う。
import { createRng, deriveSeed } from './rng.js';
import { calendarYear } from './calendar.js';
import { birth } from './birth.js';
import { planYear, endYear, historyLine } from './year.js';
import { fireEvent } from './events.js';
import { buildWorld } from './world.js';
import { DATA } from '../data/index.js';

// 出来事・分かれ道・仕組みの置き場（world.js でまとめる）
export const WORLD = buildWorld();

// 1倍速の1年の秒数（目標の分数で一生が終わるように）
export function secondsPerYear(e0, minutes = 12) {
  return (minutes * 60) / Math.max(e0, 60);
}

function birthLines(s) {
  const who = s.sex === 'female' ? '女の子' : '男の子';
  return [{ age: 0, year: s.birthYear, t: 0, kind: 'big', text: `${s.pref}の${s.surname}家に、${who}が生まれました。名前は${s.name}です。` }];
}

export function summarize(s, decisions, data) {
  const c = s.career;
  return {
    version: data.DATA_VERSION, seed: s.seed, era: s.era, birthYear: s.birthYear, pref: s.pref, sex: s.sex,
    name: `${s.surname}${s.name}`, surname: s.surname, given: s.name, route: s.route, aspireAge: s.aspireAge, aspireKind: s.aspireKind, aptitude: s.aptitude,
    jobHistory: [...(c.jobHistory ?? [])], inSchoolPass: !!c.inSchoolPass,
    registerAge: c.registeredAt, kanpouAge: c.kanpouAge, jitsumuAtRegister: c.jitsumuAtRegister ?? null, gradSchool: c.gradSchool, gradField: (c.gradHistory?.[0] ?? c.grad)?.field ?? null, gradFields: [...(c.gradHistory ?? []), ...(c.grad ? [c.grad] : [])].map(g => g.field), passYears: c.kanpouAge != null && c.firstExamAge != null ? c.kanpouAge - c.firstExamAge + 1 : null,
    taxOfficeYears: c.taxOfficeYears, cpaPassYear: c.cpaPassYear, cpaPassAge: c.cpaPassAge ?? null, kenshuAge: c.kenshuAge ?? null, auditFirm: c.auditFirm ?? null, cpaMode: c.cpaMode ?? null, method: c.method ?? null, siblings: s.siblings.length, univ: s.flags.has('will-univ'),
    lawPassAge: c.lawPassAge ?? null, lawyerSince: c.lawyerSince,
    subjectsOrder: c.subjectsOrder ?? null, workplaces: [...c.workplaces], clientsMax: c.clientsMax,
    family: {
      marriages: (s.family?.marriages ?? []).map(m => ({ ...m })),
      children: s.children.map(x => ({ name: x.name, sex: x.sex, bornAge: x.bornAge })),
      grandchildren: s.grandchildren.map(x => ({ name: x.name, sex: x.sex, bornAge: x.bornAge })),
      names: [s.name, ...s.parents.map(p => p.name), ...s.siblings.map(b => b.name), ...(s.family?.marriages ?? []).map(m => m.name), ...s.children.map(x => x.name), ...s.grandchildren.map(x => x.name)],
    },
    paths: [...(c.paths ?? [])], specialty: c.specialty ?? null,
    arcs: (s.arcLog ?? []).map(r => ({ id: r.id, done: r.done, steps: r.steps.map(x => ({ ...x })) })),
    kaigyoAt: c.kaigyoAt, retiredAt: c.retiredAt, workHistory: [...(c.workHistory ?? [])], successor: c.successor,
    deathAge: s.deathAge, deathCause: s.deathCause, decisions,
    peers: (s.peers ?? []).map(p => ({ surname: p.surname, name: p.name, sex: p.sex, outcomes: p.outcomes.map(o => ({ age: o.age, kind: o.kind })) })),
  };
}

// 仕組みが返した行に、年齢・暦年・時刻を付ける
export function withWhen(lines, age, year, t) {
  return lines.map(l => ({ age, year, t, ...l, kind: l.kind ?? 'ev' }));
}

// 出生届の画面のための、生まれたときの姿（同じ種なら runLife と同じ人）
export function birthCard(config, data = DATA) {
  const s = birth(config, data);
  const e0 = data.LIFE[s.era].e0[s.sex].value;
  const sib = b => (b.birthYear < s.birthYear ? (b.sex === 'male' ? '兄' : '姉') : (b.sex === 'male' ? '弟' : '妹'));
  return {
    surname: s.surname, given: s.name, name: `${s.surname} ${s.name}`, sex: s.sex, sexLabel: s.sex === 'female' ? '女の子' : '男の子',
    pref: s.pref, birthYear: s.birthYear,
    tierDots: '●'.repeat(s.tier) + '○'.repeat(5 - s.tier), tierLabel: `5段階中${s.tier}`,
    parents: s.parents.map(p => ({ role: p.role === 'father' ? '父' : '母', age: p.age, name: p.name })),
    siblings: s.siblings.map(b => ({ label: sib(b), name: b.name, ageDiff: s.birthYear - b.birthYear })),
    e0, minutes: Math.round((secondsPerYear(e0) * e0) / 60),
    stats: { ...s.stats },
  };
}

export function* runLife(config, data = DATA, world = WORLD) {
  const s = birth(config, data);
  const decisions = [];
  const ask = { choices: config.choices ? [...config.choices] : null, decisions };
  for (const line of birthLines(s)) yield { kind: 'line', line };
  while (s.alive) {
    // 途中で危ない言葉が書かれたら、その年齢から先は自殺の判定をしない（画面が config.suppressFrom を入れる）
    if (config.suppressFrom != null && s.age >= config.suppressFrom) s.suppressSuicide = true;
    const year = calendarYear(s.birthYear, s.age);
    const rng = createRng(deriveSeed(s.seed, 'y', s.age));
    const ctx = { rng, year, age: s.age, data, t: 0, world, ask };
    if (!s.imagineShown && year >= data.IMAGINE_LINE_YEAR) {
      s.imagineShown = true;
      yield { kind: 'line', line: { age: s.age, year, t: 0, kind: 'imagine', text: 'ここから先は想像です。' } };
    }
    for (const it of planYear(s, data, rng, world)) {
      if (!s.alive) break;
      ctx.t = it.t;
      let lines = [];
      if (it.type === 'event') lines = fireEvent(it.ref, s, ctx);
      else if (it.type === 'history') { const l = historyLine(it.ref, s, year); lines = l ? [l] : []; }
      else if (it.type === 'fixed') lines = withWhen(it.run(s, ctx) ?? [], s.age, year, it.t);
      else if (it.type === 'decision') lines = it.ref.needs && !it.ref.needs(s, ctx) ? [] : yield* world.askDecision(it.ref, s, ctx);
      for (const line of lines) yield { kind: 'line', line };
    }
    if (!s.alive) break;
    // その年の途中（振り返り）で判定止めが入ったら、その年の終わりの判定から止める
    if (config.suppressFrom != null && s.age >= config.suppressFrom) s.suppressSuicide = true;
    for (const line of endYear(s, data, rng, world)) yield { kind: 'line', line };
    // 毎年の記録（数値と、画面の上の欄に出す立場と合格した科目）
    config.trace?.push({ age: s.age - (s.alive ? 1 : 0), stats: { ...s.stats }, career: { phase: s.career.phase, workStyle: s.career.workStyle ?? null, passed: [...(s.career.passed ?? [])], exemptTax: !!s.career.exemptTax, exemptAcc: !!s.career.exemptAcc } });
  }
  return summarize(s, decisions, data);
}

// おまかせで最後まで回す。chooser(view) が k を返せばその答え、undefined ならおまかせ。
export function runAuto(config, data = DATA, world = WORLD, chooser = () => undefined) {
  const lines = [];
  const gen = runLife(config, data, world);
  let r = gen.next();
  while (!r.done) {
    if (r.value.kind === 'line') { lines.push(r.value.line); r = gen.next(); }
    else r = gen.next(chooser(r.value.view));
  }
  return { lines, summary: r.value };
}
