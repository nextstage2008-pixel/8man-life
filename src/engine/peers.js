// 同期4人。同じ年に始めた人を、簡易の計算で最後まで回しておき、本人の人生の中でその年に一行ずつ知らせる。
// 同期は「志した人全体」から引くので、撤退も起こる（本人は必ず登録まで届く）。
import { createRng, deriveSeed, randInt, normal } from './rng.js';
import { clamp } from './odds.js';
import { pickName } from './birth.js';
import { qFor } from './family.js';
import { PEER_TEXTS as T } from '../data/events/peers.js';

const say = (arr, s, rng, vars) => arr[Math.floor(rng() * arr.length)](Object.assign(Object.create(s), vars));

// 始まった年（その年の終わりに同期を作る）
function started(s) {
  const c = s.career;
  if (s.route === 'exam') return c.firstExamAge === s.age;
  if (s.route === 'tax-office') return c.phase === 'tax-office' && c.taxOfficeYears === 1;
  if (s.route === 'cpa') return c.phase === 'cpa' && c.cpaPassYear === s.birthYear + s.age;
  return c.lawyerSince === s.age;
}

function deathAge(sex, startAge, birthYear, rng, data, era) {
  for (let a = startAge + 1; a <= 110; a++) if (a >= 110 || rng() < qFor(sex, a, data, era)) return a;
  return 110;
}

function outcomes(route, peer, rng, data, era, startAge) {
  const out = [];
  const at = (age, kind) => out.push({ age, kind });
  if (route === 'exam') {
    if (rng() < data.ROUTES.peerQuitShare.value) at(startAge + randInt(rng, 1, 8), 'quit');
    else {
      const done = startAge + clamp(Math.round(normal(rng, data.EXAM.kanpouYearsTarget.value, 4)), 2, 30);
      at(done, 'pass');
      at(done + randInt(rng, 1, 2), 'register');
      if (rng() < 0.7) at(done + randInt(rng, 3, 15), 'kaigyo');
    }
  } else if (route === 'tax-office') {
    if (rng() < 0.12) at(startAge + randInt(rng, 3, 15), 'leave');
    else {
      if (rng() < 0.12) at(startAge + randInt(rng, 33, 38), 'shocho');
      if (rng() < 0.6) at(65, 'ob');
    }
  } else if (route === 'cpa') {
    if (rng() < 0.5) at(startAge + randInt(rng, 3, 12), 'tax');
    else if (rng() < 0.3) at(startAge + randInt(rng, 12, 20), 'audit');
  } else if (rng() < 0.4) at(startAge + randInt(rng, 5, 15), 'dokuritsu');
  const last = Math.max(startAge, ...out.map(o => o.age));
  const d = deathAge(peer.sex, last, 0, rng, data, era);
  out.push({ age: d, kind: 'death' });
  return out.sort((a, b) => a.age - b.age).filter(o => o.age <= 110);
}

export function makePeers(s, data) {
  const rng = createRng(deriveSeed(s.seed, 'peer'));
  const surnames = new Set([s.surname]);
  const peers = [];
  for (let i = 0; i < 4; i++) {
    const prng = createRng(deriveSeed(s.seed, 'peer', i));
    const female = data.ROUTES.femaleShareByRoute[s.era][s.route].value;
    const sex = prng() < female ? 'female' : 'male';
    const ageGap = s.route === 'exam' ? clamp(Math.round(normal(prng, 0, 6)), -15, 20) : randInt(prng, -2, 3);
    const startAge = clamp(s.age + ageGap, 18, 60);
    let surname;
    do surname = data.SURNAMES[Math.floor(prng() * data.SURNAMES.length)]; while (surnames.has(surname));
    surnames.add(surname);
    const name = pickName(prng, sex, s.birthYear + s.age - startAge, s.usedNames);
    const peer = { surname, name, sex, offset: startAge - s.age };
    // 同期の年齢で起きることを、本人の年齢に直して持つ
    peer.outcomes = outcomes(s.route, peer, prng, data, s.era, startAge).map(o => ({ ...o, age: o.age - peer.offset }));
    peers.push(peer);
  }
  rng();
  return peers;
}

export const PEER_SYSTEM = {
  id: 'peers',
  end(s, ctx) {
    const out = [];
    if (!s.peers && started(s)) {
      s.peers = makePeers(s, ctx.data);
      out.push({ kind: 'peer', text: say(T.intro[s.route], s, ctx.rng, { _names: s.peers.map(p => `${p.surname}${p.name}さん`).join('、') }) });
    }
    for (const p of s.peers ?? []) {
      for (const o of p.outcomes) {
        if (o.age !== s.age || o.told) continue;
        o.told = true;
        out.push({ kind: 'peer', text: say(T[o.kind], s, ctx.rng, { _who: p.surname }) });
      }
    }
    return out;
  },
};
