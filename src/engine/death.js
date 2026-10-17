// 本人の死亡。生命表の死亡率から自殺の分を除いた率に、健康・たばこ・飲酒・持病・孤立の倍率をかける。
// 自殺は選択肢に出さず、その年齢・性別の自殺率に心の状態の倍率をかけて起こす（倍率は推定・本家の解析と同じ考え方）。
// 本人は必ず登録まで届くので、登録の前は判定しない。110歳で必ず亡くなる。
import { pickWeighted } from './rng.js';
import { textAllowed } from './text.js';
import { isRegistered, causeFor } from './year.js';
import { qFor } from './family.js';
import { FAMILY_TEXTS as T, SUPPORT_LINES } from '../data/events/family.js';

export const DEATH_OR = {
  estimated: true,
  smoke: 1.7, drink: 1.3, illness: 1.3, lonely: 1.2,
  mental: { none: 0.6, consult: 2.5, tell: 3, alone: 5 },
  widowed: 1.3,
  // 集団の平均の倍率が1になるようにそろえる係数（生命表と自殺統計にはもともと喫煙者や心の不調の人が入っている）。
  // 較正は1万人以上：norm 0.73 で享年は生命表の期待値と男女とも±0.8年、suicideNorm 1.6 で自殺は期待値の0.93〜1.22倍（平均およそ1.07倍）
  norm: 0.73, suicideNorm: 1.6,
};

export function suicideBase(s, data) {
  const t = data.LIFE[s.era].suicideRateByAgeSex[s.sex];
  return (t.find(b => s.age >= b.from && s.age <= b.to)?.per100k ?? 0) / 1e5;
}

function finalLines(s, ctx, cause) {
  const { data } = ctx;
  const out = [];
  const arr = T.death[cause] ?? [st => `${st._age}歳で、${data.CAUSES[cause].label}のため亡くなりました。`];
  const text = arr[Math.floor(ctx.rng() * arr.length)](Object.assign(Object.create(s), { _age: s.age }));
  out.push({ kind: 'loss', text, final: true });
  if (cause !== 'suicide') {
    const who = [];
    if (s.spouse?.alive && !s.spouse.divorced) who.push(s.spouse.name);
    const kids = s.children.filter(c => c.alive).map(c => c.name);
    if (kids.length) who.push(kids.length > 2 ? `${kids.slice(0, 2).join('と')}たち` : kids.join('と'));
    if (who.length) out.push({ kind: 'ev', text: T.seeOff[0](Object.assign(Object.create(s), { _who: who.join('と') })) });
    const words = T.lastWords.filter(t => textAllowed(t, s));
    if (ctx.rng() < 0.4 && words.length) out.push({ kind: 'ev', text: words[Math.floor(ctx.rng() * words.length)] });
  } else {
    for (const t of SUPPORT_LINES) out.push({ kind: 'support', text: t });
  }
  return out;
}

function die(s, ctx, cause) {
  s.alive = false;
  s.deathAge = s.age;
  s.deathCause = cause;
  return finalLines(s, ctx, cause).map(l => ({ age: s.age, year: ctx.year, t: 0.97, ...l }));
}

export function deathStep(s, ctx) {
  const { data, rng } = ctx;
  if (s.age >= 110) return die(s, ctx, 'senility');
  if (!isRegistered(s)) return [];
  // 自殺
  // 判定を止めているときも乱数は引く（並びが変わると、そのあとの人生が別のものになる）
  if (s.age >= 10) {
    const r = rng();
    let m = DEATH_OR.mental[s.mental?.k ?? 'none'] * DEATH_OR.suicideNorm;
    if (s.widowedAt != null && s.age - s.widowedAt <= 2) m *= DEATH_OR.widowed;
    if (!s.suppressSuicide && r < suicideBase(s, data) * m) return die(s, ctx, 'suicide');
  }
  // 自殺以外
  const q = Math.max(0, qFor(s.sex, s.age, data, s.era) - suicideBase(s, data));
  let m = Math.exp((60 - s.stats.hl) * 0.03);
  if (s.habits.smoke) m *= DEATH_OR.smoke;
  if (s.habits.drink) m *= DEATH_OR.drink;
  m *= DEATH_OR.illness ** s.illnesses.length;
  if (!(s.spouse?.alive && !s.spouse.divorced) && s.stats.so < 40) m *= DEATH_OR.lonely;
  m = Math.min(9, Math.max(0.25, m * DEATH_OR.norm));
  if (s.age >= 85) m = 1 + (m - 1) * 0.5;
  if (rng() < 1 - (1 - q) ** m) {
    // 持病があれば、その病気で亡くなりやすい
    let cause = causeFor(s.age, data, s.era, rng);
    if (s.illnesses.length && rng() < 0.6) cause = pickWeighted(rng, Object.fromEntries(s.illnesses.map(i => [i.type, 1])));
    return die(s, ctx, cause);
  }
  return [];
}
