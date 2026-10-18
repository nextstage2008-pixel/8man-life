// 学校のころの転機（お金と転機の設計書6）。決まった年齢に分かれ道を置き（この仕組みからは1年に1つ・重なったら次の年）、
// 年の終わりに学費（家の貯蓄から）・アルバイト（自分の貯蓄へ）・奨学金（卒業してから返す）・大学院の学費を動かす。
import { monthT } from './calendar.js';
import { spend, earn, addLoan } from './money.js';
import { OJUKEN, CHUJUKEN, BUKATSU, KOKO, BAITO, SHOGAKUKIN } from '../data/decisions/school.js';

const schoolEnd = s => s.schoolEndAge ?? (s.flags.has('will-univ') ? 22 : 18);

// 受験の話が来やすさ：その県の私立・国立に通う割合×倍率×家の暮らし向き（受ける半分・受かる8割で、通う割合が県の値に近くなる）
export function jukenOfferRate(s, data, level) {
  const SC = data.MONEY.school.value;
  const share = data.MONEY.privateSchoolShare.value[level][s.pref] ?? 0;
  return Math.min(1, share * SC.offerScale * SC.tierFactor[(s.tier ?? 3) - 1]);
}

function due(s, d) {
  if (s.age < d.ages[0] || s.age > d.ages[1]) return false;
  if (d.needs && !d.needs(s)) return false;
  const n = s.decisionCounts.get(d.id) ?? 0;
  if (d.id !== 'baito') return n === 0;
  // アルバイト：大学に行く人は大学（19〜20歳）で、ほかの人は高校（16〜17歳）で1回（分かれ道を25〜30回に保つ）
  if (n > 0) return false;
  return s.flags.has('will-univ') ? s.age >= 19 : s.age <= 17;
}

// 家の貯蓄から出す。大学の学費が足りなければ、足りない分は奨学金（卒業してから返す）
function payHouse(s, amount, data, lines) {
  const m = s.money;
  if (m.house.savings >= amount) { m.house.savings -= amount; return; }
  const short = amount - m.house.savings;
  m.house.savings = 0;
  if (s.flags.has('will-univ') && s.age >= 18 && s.age < schoolEnd(s)) {
    addLoan(s, 'shogakukin', short, data.MONEY.scholarship.value.repayYears, schoolEnd(s));
    if (!s.school.paid.shortLine) { s.school.paid.shortLine = true; lines.push({ kind: 'ev', text: '家の貯蓄だけでは学費が足りず、奨学金を借りました。' }); }
  }
}

// 大学院の学費：若いうち（30歳まで）で家に余裕があれば親が出し、なければ自分の貯蓄から、足りなければ奨学金（先生の指摘 10/18）
function payGrad(s, cost, data, lines, first) {
  const m = s.money;
  const say = text => { if (first) lines.push({ kind: 'ev', text }); };
  if (s.age < 30 && s.parents.some(p => p.alive) && m.house.savings >= cost) { spend(s, cost, 'house'); say('大学院の学費は、親が出してくれました。'); return; }
  if (m.savings >= cost) { m.savings -= cost; say('大学院の学費は、自分の貯蓄から出しました。'); return; }
  const short = cost - m.savings;
  m.savings = 0;
  addLoan(s, 'shogakukin', short, data.MONEY.scholarship.value.repayYears, s.age + 2);
  say('大学院の学費のために、奨学金を借りました。');
}

export const SCHOOL_SYSTEM = {
  id: 'school',
  plan(s, ctx) {
    const sc = s.school;
    if (s.age === 5 && sc.offers.ojuken == null) sc.offers.ojuken = ctx.rng() < jukenOfferRate(s, ctx.data, '小');
    if (s.age === 11 && sc.offers.chujuken == null) sc.offers.chujuken = sc.sho !== 'private' && ctx.rng() < jukenOfferRate(s, ctx.data, '中');
    const order = [...(sc.offers.ojuken ? [OJUKEN] : []), ...(sc.offers.chujuken ? [CHUJUKEN] : []), BUKATSU, KOKO, BAITO, SHOGAKUKIN];
    const d = order.find(x => due(s, x));
    return d ? [{ t: monthT(4), type: 'decision', ref: d }] : [];
  },
  end(s, ctx) {
    const { data } = ctx;
    const E = data.MONEY.education.value, SC = data.MONEY.school.value, sc = s.school;
    const lines = [];
    // 私立の小中高は、公立との差の学費を家の貯蓄から
    if (s.age >= 6 && s.age <= 11 && sc.sho === 'private') payHouse(s, E.shoPrivate - E.shoPublic, data, lines);
    if (s.age >= 12 && s.age <= 14 && sc.chu === 'private') payHouse(s, E.chuPrivate - E.chuPublic, data, lines);
    if (s.age >= 15 && s.age <= 17 && sc.ko === 'private') payHouse(s, E.koPrivate - E.koPublic, data, lines);
    if (s.age === 11 && sc.juku) payHouse(s, E.juku, data, lines);
    // 専門学校の学費（推定）を家の貯蓄から
    if (sc.senmon && s.age >= 18 && s.age < schoolEnd(s)) payHouse(s, SC.senmonTuition, data, lines);
    // 私立の小学校の子は、そのまま系列の中学・高校へ
    if (s.age === 11 && sc.sho === 'private' && !sc.ikkan) {
      sc.chu = 'private'; sc.ko = 'private'; sc.ikkan = true;
      lines.push({ kind: 'ev', text: 'そのまま系列の中高一貫の中学校に進みました。' });
    }
    // 大学：学費（私立か国立か）と、家を出ていれば下宿の暮らしの費用を家から。奨学金を借りた人は、その分を学費にあてる
    if (s.flags.has('will-univ') && s.age >= 18 && s.age < schoolEnd(s)) {
      if (sc.univ == null) sc.univ = ctx.rng() < SC.univPrivateShare ? 'private' : 'public';
      let cost = sc.univ === 'private' ? E.univPrivate : E.univPublic;
      if (s.home.leftParents) cost += E.univAway;
      if (sc.shogakukin) {
        const S = data.MONEY.scholarship.value;
        addLoan(s, 'shogakukin', S.perYear, S.repayYears, schoolEnd(s));
        s.money.house.savings += S.perYear;
      }
      payHouse(s, cost, data, lines);
    }
    // アルバイト（学校に通う間）
    if (sc.baito && s.age < schoolEnd(s)) earn(s, s.age >= 18 ? data.MONEY.wage.value.partTime : SC.partTimeKo);
    // 大学院（試験組の税法・会計学）と法科大学院：2年分
    const g = s.career.grad;
    if (g && s.age >= g.start && s.age <= g.start + 1) {
      const key = `grad-${g.start}-${s.age}`;
      if (!sc.paid[key]) { sc.paid[key] = true; payGrad(s, E.gradPrivate, data, lines, s.age === g.start); }
    }
    if (s.flags.has('law-school')) {
      sc.lawStart = sc.lawStart ?? s.age;
      const key = `law-${s.age}`;
      if (s.age <= sc.lawStart + 1 && !sc.paid[key]) { sc.paid[key] = true; payGrad(s, E.lawSchoolPrivate, data, lines, s.age === sc.lawStart); }
    }
    return lines;
  },
};
