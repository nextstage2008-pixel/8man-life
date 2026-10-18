// 生まれのくじ。本人は「登録した8万人」の1人なので、道と男女と志す年齢を先に引き、
// そのあとで生まれ年・県・家庭・家族を決める（設計書5.4）。
import { createRng, deriveSeed, pickWeighted, randInt, normal } from './rng.js';
import { createState } from './state.js';
import { namesFor } from '../data/names.js';
import { clamp } from './odds.js';
import { initMoney } from './money.js';

const pickBin = (rng, dist) => {
  const i = Number(pickWeighted(rng, Object.fromEntries(dist.map((b, k) => [k, b.w]))));
  return randInt(rng, dist[i].from, dist[i].to);
};

// 一覧から、まだ使っていない名前を選ぶ（家族の中で名前が重ならないように）
export function pickName(rng, sex, year, used) {
  const list = namesFor(sex, year);
  const free = list.filter(n => !used.has(n));
  const name = (free.length ? free : list)[Math.floor(rng() * (free.length ? free.length : list.length))];
  used.add(name);
  return name;
}

export function birth(config, data) {
  const { seed, era = 'heisei', birthMode = 'births', forceRoute } = config;
  const rng = createRng(deriveSeed(seed, 'birth'));
  const s = createState();
  s.seed = seed;
  s.era = era;
  s.suppressSuicide = !!config.suppressSuicide;

  // 先に引く：道・男女・志す年齢
  const shares = data.ROUTES.shareByEra[era];
  s.route = forceRoute ?? pickWeighted(rng, Object.fromEntries(Object.entries(shares).map(([k, v]) => [k, v.value])));
  s.sex = rng() < data.ROUTES.femaleShareByRoute[era][s.route].value ? 'female' : 'male';
  s.aspireAge = pickBin(rng, data.ROUTES.aspireAgeByRoute[era][s.route].dist);

  if (s.route === 'exam') {
    s.aspireKind = s.aspireAge <= 22 && rng() < 0.8 ? 'univ' : (rng() < 0.5 ? 'jimusho' : 'keiri');
    if (s.aspireKind === 'univ') s.flags.add('will-univ');
    // 社会人になってから志す人も、一部は大学を出てから働いている
    else if (s.aspireAge >= 22 && rng() < data.ROUTES.examAdultUnivShare.value) s.flags.add('will-univ');
  } else if (s.route === 'tax-office') {
    s.career.taxOfficeEntry = s.aspireAge <= 19 ? 'zeimu-shokuin' : 'kokuzei-senmonkan';
    s.aspireKind = s.career.taxOfficeEntry;
    if (s.career.taxOfficeEntry === 'kokuzei-senmonkan') s.flags.add('will-univ');
  } else if (s.route === 'cpa') {
    s.aspireKind = 'cpa';
    if (rng() < 0.9) s.flags.add('will-univ');
  } else {
    s.aspireKind = 'lawyer';
    s.flags.add('will-univ');
  }

  // そのあと：生まれ年・県・家庭
  const [y0, y1] = data.ERAS[era].birthYears;
  s.birthYear = randInt(rng, y0, y1);
  const prefW = Object.fromEntries(data.PREFS.map(p => [p.name, birthMode === 'population' ? p.pop2024 : p.births2000]));
  s.pref = pickWeighted(rng, prefW);
  s.residence = s.pref;
  s.tier = randInt(rng, 1, 5);
  s.talent = clamp(normal(rng, 0, 1), -3, 3);
  s.stats.sm = clamp(Math.round(55 + 12 * s.talent), 5, 95);

  // 名前と家族（名前は重ならない）
  s.surname = data.SURNAMES[Math.floor(rng() * data.SURNAMES.length)];
  s.name = pickName(rng, s.sex, s.birthYear, s.usedNames);
  const fatherAge = clamp(Math.round(normal(rng, 33, 5)), 20, 55);
  const motherAge = clamp(Math.round(normal(rng, 31, 4.3)), 18, 45);
  s.parents = [
    { role: 'father', age: fatherAge, alive: true, name: pickName(rng, 'male', s.birthYear - fatherAge, s.usedNames) },
    { role: 'mother', age: motherAge, alive: true, name: pickName(rng, 'female', s.birthYear - motherAge, s.usedNames) },
  ];
  const kids = Math.max(1, Number(pickWeighted(rng, Object.fromEntries(Object.entries(data.LIFE[era].childrenDist.value)))));
  for (let i = 1; i < kids; i++) {
    const offset = (rng() < 0.5 ? -1 : 1) * randInt(rng, 1, 6);
    const sex = rng() < 0.512 ? 'male' : 'female';
    s.siblings.push({ sex, birthYear: s.birthYear + offset, alive: true, name: pickName(rng, sex, s.birthYear + offset, s.usedNames) });
  }
  // 受験の力：才能・勉強のやり方・粘り強さをまとめたもの（才能と相関・標準偏差1）。すんなり受かる人と苦労する人を分ける
  s.aptitude = clamp(0.6 * s.talent + 0.8 * normal(rng, 0, 1), -3, 3);
  initMoney(s, data);
  return s;
}
