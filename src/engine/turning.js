// 働き始めてからと家族の転機を、決まった時に置く（この仕組みからは1年に1つ・重なったら次の年に回す）。
// 開業資金（独立を決めた翌年）→ 子どもの人数（結婚の翌年から）→ 子育てとの両立（子が生まれた翌年）→ 就職活動 → 頑張り具合（節目ごと）の順に先にする。
// 恋愛と結婚は engine/family.js が置く。
import { monthT } from './calendar.js';
import { SHUSHOKU, GANBARI, KODOMO, RYORITSU, KAIGYO_SHIKIN } from '../data/decisions/turning.js';

const married = s => !!(s.spouse && s.spouse.alive && !s.spouse.divorced);
const schoolEnd = s => s.schoolEndAge ?? (s.flags.has('will-univ') ? 22 : 18);
const working = s => s.money.income > 0 || s.career.phase === 'examinee';

export const TURNING_SYSTEM = {
  id: 'turning',
  plan(s, ctx) {
    const c = s.career;
    const t = (s.turn = s.turn ?? { ganbari: [], seen: new Set(), ryoritsu: new Set() });
    // 頑張り具合の節目を積む（就職・登録・45歳。1回の人生の分かれ道を25〜30回に保つため3つにした）
    const add = key => { if (!t.seen.has(key)) { t.seen.add(key); t.ganbari.push(key); } };
    const active = c.phase !== 'retired';
    if (active && s.money.income > 0 && s.age >= schoolEnd(s)) add('work');
    if (active && c.registeredAt != null && s.age > c.registeredAt) add('register');
    if (active && s.age >= 45 && t.seen.has('work')) add('45');
    const item = (ref, m = 4) => [{ t: monthT(m), type: 'decision', ref }];
    // 開業資金：独立を決めた翌年の初め（その年の終わりに開業する）。弁護士と、事務所を継いだ人には聞かない
    if (c.kaigyoPlan && c.workStyle !== 'kaigyo' && c.workStyle !== 'shain' && s.age > (c.kaigyoPlanAt ?? s.age) && s.route !== 'lawyer' && !s.decisionCounts.has('kaigyo-shikin')) return item(KAIGYO_SHIKIN, 2);
    if (married(s) && s.childTarget == null && s.age >= s.spouse.marriedAt + 1 && (s.decisionCounts.get('kodomo') ?? 0) < 2) return item(KODOMO, 3);
    // 子が生まれた翌年（ほかの転機と重なったら、その次の年）
    const born = s.children.find(k => s.age - k.bornAge >= 1 && s.age - k.bornAge <= 2 && !t.ryoritsu.has(k.name));
    if (born && working(s) && (s.decisionCounts.get('ryoritsu') ?? 0) < 2) {
      t.ryoritsu.add(born.name);
      return item({ ...RYORITSU, build: st => RYORITSU.build(Object.assign(Object.create(st), { _child: born.name })) }, 5);
    }
    // 就職活動は大学の最後の年だけ（高校を出る人は「高校を出たらどうしますか」で就職を選ぶ）
    const shu = !s.decisionCounts.has('shushoku') && s.flags.has('will-univ') && s.age === 21;
    if (shu) return item({ ...SHUSHOKU, needs: st => SHUSHOKU.needs(st) && !st.flags.has('boki1') }, 10);
    if (active && t.ganbari.length) {
      const key = t.ganbari.shift();
      return item({ ...GANBARI, build: st => GANBARI.build(Object.assign(Object.create(st), { _ganbari: key })) }, 6);
    }
    return [];
  },
};
