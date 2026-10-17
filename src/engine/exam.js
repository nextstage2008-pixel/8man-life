// 試験組の道：受験資格・科目の選び方・合格の確率・官報合格（または大学院の免除）・実務経験・登録。
import { sayFresh } from './text.js';
import { odds, clamp } from './odds.js';
import { monthT } from './calendar.js';
import { pickWeighted } from './rng.js';
import { schoolEndAge } from './year.js';
import { rateFor } from '../data/exam.js';
import { EXAM_TEXTS as T } from '../data/events/exam.js';
import { EXAM_JOB, EXAM_LOAD, EXAM_GRAD, EXAM_GRAD2, EXAM_BACK } from '../data/decisions/exam.js';

// 合格の確率にかける倍率（オッズ比）。公表データがないので推定。全体の較正で決めた値。
export const EXAM_OR = {
  estimated: true,
  focus: { study: 1.8, normal: 1.0, work: 0.6 },
  knowledgePerPoint: 0.03,
  fulltime: 1.3,
  aptitude: 1.3, // 受験の力1つ分で、合格のオッズが約3.7倍（−1.5〜2.5で止める）
  retryGrowth: 1.35,
  longHaul: 3, // 受験25年を過ぎた人（極端に長い人生を抑える） // 同じ科目を受け直すたびに掛け算で上がる（受験の経験）。登録した人だけを描くので、いつかは届く
};

const LOAD_N = { one: 1, two: 2, three: 3 };
// 税法の科目の人気（R7の受験者数）。必須の科目は法人税法7割・所得税法3割（推定）
const TAX_POPULAR = { shohi: 7064, sozoku: 2413, choshu: 1671, kotei: 928, shuzei: 590, jumin: 439, jigyo: 310 };
const GROUPS = [['shohi', 'shuzei'], ['jumin', 'jigyo']];

function ageRate(age, data) {
  return data.EXAM.passRateByAge.find(b => age >= b.from && age <= b.to).rate;
}

export function passProb(s, subjectId, year, data) {
  const c = s.career;
  let or = EXAM_OR.focus[c.focusBoostAge === s.age ? 'study' : (c.focus ?? 'normal')];
  or *= Math.exp(EXAM_OR.knowledgePerPoint * (s.stats.sm - 60));
  if (c.fulltime || (s.flags.has('will-univ') && s.age < schoolEndAge(s))) or *= EXAM_OR.fulltime;
  or *= Math.exp(EXAM_OR.aptitude * clamp(s.aptitude ?? 0, -1.5, 2.5));
  or *= ageRate(s.age, data) / data.EXAM.overallPassRate2025;
  or *= EXAM_OR.retryGrowth ** (c.tries?.[subjectId] ?? 0);
  if (c.examYears >= 25) or *= EXAM_OR.longHaul;
  return odds(rateFor(subjectId, year), or);
}

// 受験資格。会計の科目は2023年から誰でも受けられる。税法の科目は学識（大学3年以上）・実務2年・資格のどれかが要る。
export function canSit(s, kind, year) {
  if (kind === 'accounting' && year >= 2023) return true;
  if (s.flags.has('will-univ') && s.age >= 20) return true;
  if (s.career.jitsumuYears >= 2) return true;
  return s.flags.has('boki1');
}

const say = sayFresh;
const line = (text, kind = 'ev') => ({ kind, text });
const ACCOUNTING = ['boki', 'zaihyo'];

function taxPassed(c) { return [...c.passed].filter(id => !ACCOUNTING.includes(id)); }

export function examDone(c) {
  // 会計学の修士で認定を受けた人は、会計の1科目の合格で会計がそろう（税理士法7条3項）
  const accDone = ACCOUNTING.every(id => c.passed.has(id)) || (!!c.exemptAcc && ACCOUNTING.some(id => c.passed.has(id)));
  const tax = taxPassed(c);
  if (c.exemptTax) return accDone && tax.length >= 1;
  return accDone && tax.length >= 3 && (tax.includes('hojin') || tax.includes('shotoku'));
}

function chooseTaxPlan(rng) {
  const req = rng() < 0.7 ? 'hojin' : 'shotoku';
  const plan = [req];
  const pool = { ...TAX_POPULAR };
  while (plan.length < 3) {
    const k = pickWeighted(rng, pool);
    delete pool[k];
    const g = GROUPS.find(gr => gr.includes(k));
    if (g) for (const x of g) delete pool[x];
    plan.push(k);
  }
  return plan;
}

// その年に受ける科目（会計を先に、次に税法の計画の順）
function subjectsThisYear(s, year, rng) {
  const c = s.career;
  const want = [];
  // 会計学の大学院の人は、会計の1科目に受かったら残りは認定を待つ
  const accWait = (c.exemptAcc || c.grad?.field === 'kaikei') && ACCOUNTING.some(id => c.passed.has(id));
  if (canSit(s, 'accounting', year) && !accWait) for (const id of ACCOUNTING) if (!c.passed.has(id)) want.push(id);
  if (canSit(s, 'tax', year)) {
    if (!c.taxPlan) c.taxPlan = chooseTaxPlan(rng);
    const need = c.grad?.field === 'tax' && taxPassed(c).length === 0 ? 1 : 3;
    if (!(c.exemptTax && taxPassed(c).length >= 1)) {
      for (const id of c.taxPlan) if (!c.passed.has(id) && taxPassed(c).length + want.filter(w => !ACCOUNTING.includes(w)).length < need) want.push(id);
    }
  }
  const n = LOAD_N[c.load ?? 'two'];
  return want.slice(0, n);
}

const nameOf = (id, data) => data.EXAM.subjects.find(x => x.id === id).name;
const active = s => (s.career.phase === 'aspirant' || s.career.phase === 'examinee') && s.route === 'exam';

export const EXAM_SYSTEM = {
  id: 'exam',
  plan(s, ctx) {
    if (s.route !== 'exam') return [];
    const c = s.career;
    const items = [];
    if (c.phase === 'pre' && s.age === s.aspireAge) {
      items.push({ t: monthT(3), type: 'fixed', run: (st, cx) => {
        st.career.phase = 'aspirant';
        if (st.aspireKind === 'jimusho' || st.aspireKind === 'keiri') {
          st.career.job = st.aspireKind;
          if (st.aspireKind === 'keiri') st.career.jitsumuYears = clamp(st.age - 23, 0, 10);
          if (cx.rng() < 0.4) st.flags.add('boki1');
        }
        return [line(say(T.aspire[st.aspireKind], st, cx), 'big')];
      } });
    }
    // 登録：官報合格の翌年以降の春（合格発表は11月末で、登録の申請と審査を経る）。登録に要る実務の年数がそろっていること
    if (c.phase === 'passed' && s.age > c.kanpouAge && (c.job === 'jimusho' || c.job === 'keiri') && c.jitsumuYears >= ctx.data.SEIDO.jitsumuYears.value) {
      items.push({ t: monthT(3), type: 'fixed', run: (st, cx) => {
        const cc = st.career;
        cc.phase = 'registered';
        cc.registeredAt = st.age;
        cc.jitsumuAtRegister = cc.jitsumuYears;
        cc.workStyle = cc.job === 'keiri' ? 'kigyonai' : 'shozoku';
        cc.firm = cc.job === 'keiri' ? 'kigyo' : (cx.rng() < 0.4 ? 'hojin' : 'kojin');
        cc.workplaces.push(cc.job === 'keiri' ? '会社の経理' : cc.firm === 'hojin' ? '税理士法人' : '会計事務所');
        return [line(say(T.register, st, cx), 'big')];
      } });
    }
    // 大学院：進学の2年後の3月に修了し、その分野の1科目に受かっていれば7月に国税審議会の認定を受ける（税理士法7条2項・3項）
    if (c.grad && !c.grad.done && s.age === c.grad.start + 2) {
      items.push({ t: monthT(3), type: 'fixed', run: (st, cx) => {
        st.career.grad.done = true;
        return [line(say(T.gradDone[st.career.grad.field], st, cx))];
      } });
    }
    // 認定を待つのは受験中の人だけ（そろったあと・登録のあと・引退のあとには置かない）
    if (c.grad && !c.grad.nintei && s.age >= c.grad.start + 2 && active(s)) {
      items.push({ t: monthT(7), type: 'fixed', run: (st, cx) => {
        const cc = st.career, g = cc.grad;
        const hasOne = g.field === 'tax' ? taxPassed(cc).length >= 1 : ACCOUNTING.some(id => cc.passed.has(id));
        if (!g.done || !hasOne) return [];
        g.nintei = true;
        if (g.field === 'tax') cc.exemptTax = true; else cc.exemptAcc = true;
        if (examDone(cc)) {
          cc.phase = 'passed';
          cc.kanpouAge = st.age;
          return [line(say(T.exemptDone[g.field], st, cx), 'big')];
        }
        return [line(say(T.nintei[g.field], st, cx))];
      } });
    }
    if (!active(s) && c.phase !== 'pre') return items;
    if (c.phase === 'pre' && s.age !== s.aspireAge) return items;
    // 学校を出る年（または学校を出たあとに志した年）に、働き方を決める
    if (s.aspireKind === 'univ' && c.phase !== 'pre' && c.job == null && s.age >= schoolEndAge(s)) items.push({ t: monthT(3) + 0.01, type: 'decision', ref: EXAM_JOB });
    const canAcc = canSit(s, 'accounting', ctx.year), canTax = canSit(s, 'tax', ctx.year);
    const remaining = !examDone(c);
    if (remaining && (canAcc || canTax) && !s.flags.has('rest-year')) {
      if (c.load == null) items.push({ t: monthT(4), type: 'decision', ref: EXAM_LOAD });
      items.push({ t: monthT(8), type: 'fixed', run: (st, cx) => {
        const cc = st.career;
        cc.load = st.remembered.get('exam-load') ?? cc.load ?? 'two';
        const subs = subjectsThisYear(st, cx.year, cx.rng);
        if (!subs.length) return [];
        cc.sitting = subs;
        const first = cc.firstExamAge == null;
        if (first) { cc.firstExamAge = st.age; cc.phase = 'examinee'; }
        cc.examYears += 1;
        return [line(say(first ? T.firstSit : T.sit, st, cx, { _subjects: subs.map(id => nameOf(id, cx.data)).join('と') }))];
      } });
      items.push({ t: monthT(ctx.data.EXAM.announceMonthOf(ctx.year)), type: 'fixed', run: (st, cx) => {
        const cc = st.career;
        const out = [];
        for (const id of cc.sitting ?? []) {
          const p = passProb(st, id, cx.year, cx.data);
          cc.tries = cc.tries ?? {};
          if (cx.rng() < p) {
            cc.passed.add(id);
            (cc.subjectsOrder = cc.subjectsOrder ?? []).push({ id, name: nameOf(id, cx.data), age: st.age });
            out.push(line(say(T.pass, st, cx, { _subject: nameOf(id, cx.data), _month: cx.data.EXAM.announceMonthOf(cx.year) }), 'warm'));
          } else {
            cc.tries[id] = (cc.tries[id] ?? 0) + 1;
            const again = cc.tries[id] >= 2;
            out.push(line(say(again ? T.failAgain : T.fail, st, cx, { _subject: nameOf(id, cx.data), _tries: cc.tries[id] }), 'bad'));
          }
        }
        cc.sitting = [];
        st.stats.sm = clamp(st.stats.sm + (cc.fulltime ? 3 : 1.5), 0, 95);
        // 同じ年の7月に認定でそろった人は、ここで二度そろわない
        if (cc.phase !== 'passed' && examDone(cc)) {
          cc.phase = 'passed';
          cc.kanpouAge = st.age;
          out.push(line(say(T.kanpou, st, cx), 'big'));
        }
        return out;
      } });
    }
    // 専念して2年たったら、仕事に戻るか（専念と働きながらを行き来できる）
    if (c.job === 'senen' && c.senenSince != null && s.age - c.senenSince >= 2 && !examDone(c)) items.push({ t: monthT(1), type: 'decision', ref: EXAM_BACK });
    // 大学院の分かれ道：受験を2年以上続け、税法の合格が1科目以下のとき、一度だけ
    // 大学院の分かれ道：受験2年目と8年目（2回目は苦労している人のための道）
    // 2つ目の大学院：1つ目で認定を受け、もう1つの分野の科目がまだ残っている人に、ときどき（推定）
    if (c.phase === 'examinee' && c.grad?.nintei && !(c.gradHistory ?? []).length && !s.decisionCounts.has('exam-grad2') && s.age <= 55) {
      const left = c.grad.field === 'tax' ? !ACCOUNTING.every(id => c.passed.has(id)) : taxPassed(c).length < 3;
      if (left && ctx.rng() < 0.35) items.push({ t: monthT(2) + 0.01, type: 'decision', ref: EXAM_GRAD2 });
    }
    const gradAsks = s.decisionCounts.get('exam-grad') ?? 0;
    if (c.phase === 'examinee' && !c.grad && !(c.gradHistory ?? []).length && taxPassed(c).length <= 1 && s.age <= 50 && ((gradAsks === 0 && c.examYears >= 2) || (gradAsks === 1 && c.examYears >= 8))) {
      items.push({ t: monthT(2), type: 'decision', ref: EXAM_GRAD });
    }
    return items;
  },
  end(s, ctx) {
    if (s.route !== 'exam') return [];
    const c = s.career;
    const out = [];
    s.flags.delete('rest-year');
    if (c.job !== c.lastJob) {
      (c.jobHistory = c.jobHistory ?? []).push({ age: s.age, job: c.job });
      c.lastJob = c.job;
      c.senenSince = c.job === 'senen' ? s.age : null;
    }
    if (c.job === 'jimusho' || c.job === 'keiri') c.jitsumuYears += 1;
    if (c.job === 'jimusho') s.flags.add('busy-year');
    s.money.income = { jimusho: 300, keiri: 380, senen: 60 }[c.job] ?? 0;
    if (c.phase === 'passed') {
      if (c.job !== 'jimusho' && c.job !== 'keiri') {
        c.job = 'jimusho';
        c.fulltime = false;
        out.push(line(say(T.startJimusho, s, ctx)));
      }
    }
    return out;
  },
};
