// 税理士になってから：働き方（所属・社員・開業・企業内）・繁忙期・顧問先・職員・承継・引退。
import { monthT } from './calendar.js';
import { randInt, normal } from './rng.js';
import { clamp } from './odds.js';
import { CAREER } from '../data/career.js';
import { KAIGYO, SHAIN, HIRE, OWNER_RETIRE, EMP_RETIRE, TSUGU, DAIHYO, TO_KIGYO, HOJINKA, YUZURIUKE, MODORU, addPath } from '../data/decisions/career.js';

const ln = (text, kind = 'ev') => ({ kind, text });
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

const KAIGYO_TEXTS = [
  '事務所を開きました。看板を掛けた日、しばらく外から眺めていました。',
  '小さな部屋を借りて、自分の事務所を開きました。最初の電話が鳴るまで、三日かかりました。',
  '自宅の一室で事務所を始めました。机とパソコンと、税法の本棚だけです。',
];
const RETIRE_TEXTS = {
  yuzuru: ['事務所を後輩の税理士に譲り、引退しました。最後の日、顧問先の名簿を一緒にめくりました。', '事務所を若い税理士に引き継ぎ、引退しました。'],
  haigyo: ['事務所を閉じ、引退しました。顧問先には、信頼できる事務所を一件ずつ紹介しました。', '看板を下ろし、事務所を閉じました。'],
  emp: ['長く勤めた職場を、引退しました。', '引退の日、事務所のみんなが寄せ書きをくれました。'],
};

function startKaigyo(s, ctx) {
  const c = s.career;
  c.workStyle = 'kaigyo';
  c.firm = 'own';
  c.kaigyoAt = s.age;
  const r = s.route === 'tax-office' ? CAREER.clientsStartOB.value : CAREER.clientsStart.value;
  c.clients = randInt(ctx.rng, r.from, r.to);
  c.clientsInit = true;
  c.workplaces.push('自分の事務所');
  addPath(s, 'kaigyo');
  return [ln(pick(ctx.rng, KAIGYO_TEXTS), 'big')];
}

function retire(s, ctx, kind) {
  const c = s.career;
  c.phase = 'retired';
  c.retiredAt = s.age;
  if (kind === 'yuzuru') { c.successor = 'yuzuru'; addPath(s, 'yuzuru'); }
  if (kind === 'haigyo') { c.successor = 'haigyo'; addPath(s, 'haigyo'); }
  c.clients = 0;
  return [ln(pick(ctx.rng, RETIRE_TEXTS[kind]), 'big')];
}

export const CAREER_SYSTEM = {
  id: 'career',
  plan(s, ctx) {
    const c = s.career;
    if (c.phase !== 'registered') return [];
    const items = [];
    const years = s.age - c.registeredAt;
    // 独立の分かれ道：登録の3年後・10年後・50歳（所属・企業内のまま65歳まで）
    if ((c.workStyle === 'shozoku' || c.workStyle === 'kigyonai') && s.age <= 64 && !c.kaigyoPlan
      && (years === 3 || years === 10 || (s.age === 50 && years > 3))) items.push({ t: monthT(6), type: 'decision', ref: KAIGYO });
    // 税理士法人で6年たったら、社員の話
    if (c.workStyle === 'shozoku' && c.firm === 'hojin' && years === 6) items.push({ t: monthT(4), type: 'decision', ref: SHAIN });
    // 顧問先が25件を超えたら、職員を雇うか（一度だけ）
    if (c.workStyle === 'kaigyo' && c.clients >= 25 && c.staff === 0 && !s.decisionCounts.has('hire')) items.push({ t: monthT(7), type: 'decision', ref: HIRE });
    // 道のいろいろ（一度だけ・起こりやすさは推定）
    const once = id => !s.decisionCounts.has(id);
    if (c.workStyle === 'shozoku' && c.firm === 'kojin' && years >= 8 && s.age >= 35 && s.age <= 62 && once('tsugu') && ctx.rng() < 0.12) items.push({ t: monthT(9), type: 'decision', ref: TSUGU });
    if (c.workStyle === 'shain' && !c.daihyo && years >= 12 && once('daihyo') && ctx.rng() < 0.25) items.push({ t: monthT(4), type: 'decision', ref: DAIHYO });
    if (c.workStyle === 'shozoku' && s.age <= 55 && years >= 3 && once('to-kigyo') && ctx.rng() < 0.012) items.push({ t: monthT(8), type: 'decision', ref: TO_KIGYO });
    if (c.workStyle === 'kaigyo' && c.clients >= 35 && c.staff >= 1 && s.age - c.kaigyoAt >= 5 && once('hojinka') && ctx.rng() < 0.06) items.push({ t: monthT(9), type: 'decision', ref: HOJINKA });
    if (c.workStyle === 'kaigyo' && s.age - c.kaigyoAt >= 3 && s.age <= 65 && once('yuzuriuke') && ctx.rng() < 0.015) items.push({ t: monthT(11), type: 'decision', ref: YUZURIUKE });
    if (c.workStyle === 'kaigyo' && s.age - c.kaigyoAt >= 2 && s.age - c.kaigyoAt <= 6 && c.clients < 8 && s.age < 60 && once('modoru') && ctx.rng() < 0.25) items.push({ t: monthT(10), type: 'decision', ref: MODORU });
    // 引退：開業は70・77歳（85歳は聞かずに廃業）、それ以外は65・70・75歳に聞く
    const askAges = c.workStyle === 'kaigyo' ? [70, 77, 85] : [65, 70, 75];
    if (askAges.includes(s.age) && c.retirePlan !== 'retire') items.push({ t: monthT(10), type: 'decision', ref: c.workStyle === 'kaigyo' ? { ...OWNER_RETIRE, certainSkip: st => (st.age >= 85 ? 'haigyo' : null) } : { ...EMP_RETIRE, certainSkip: st => (st.age >= 75 ? 'retire' : null) } });
    return items;
  },
  end(s, ctx) {
    const c = s.career;
    const out = [];
    if (c.phase === 'registered') {
      if (c.kaigyoPlan && c.workStyle !== 'kaigyo' && c.workStyle !== 'shain') out.push(...startKaigyo(s, ctx));
      if (c.tsuguPlan && c.workStyle !== 'kaigyo') {
        // 所長の事務所を継ぐ：開業になり、顧問先と職員を引き継ぐ
        c.tsuguPlan = false;
        c.workStyle = 'kaigyo'; c.firm = 'own'; c.kaigyoAt = s.age; c.clientsInit = true;
        c.clients = randInt(ctx.rng, 15, 40); c.staff = Math.max(c.staff, 1);
        c.workplaces.push('所長から継いだ事務所');
        addPath(s, 'tsugu');
        out.push(ln('所長の事務所を継ぎました。看板の名前はそのままにしました。', 'big'));
      }
      if (c.workStyle === 'kaigyo' && !c.clientsInit) {
        // 登録と同時に開業した人（OB・会計士・弁護士）の最初の顧問先
        const r = s.route === 'tax-office' ? CAREER.clientsStartOB.value : CAREER.clientsStart.value;
        c.clients = randInt(ctx.rng, r.from, r.to);
        c.clientsInit = true;
      }
      if (c.workStyle === 'kaigyo') {
        // 顧問先の増減（推定）：評判で増え、70歳を過ぎると減る
        const drift = s.age < 70 ? 1.5 + (c.reputation - 50) / 15 : -2;
        c.clients = Math.max(0, Math.round(c.clients + drift + normal(ctx.rng, 0, 1.5)));
        if (c.capClients != null) c.clients = Math.min(c.clients, c.capClients + 3);
        if (c.staff === 0) c.clients = Math.min(c.clients, 35);
        c.clientsMax = Math.max(c.clientsMax, c.clients);
        s.money.income = CAREER.incomeBase.value + CAREER.incomePerClient.value * c.clients;
      } else {
        s.money.income = { shozoku: 600, kigyonai: 750, shain: 1000 }[c.workStyle] ?? 600;
      }
      c.reputation = clamp(c.reputation, 0, 100);
      s.flags.add('busy-year');
      if (c.retirePlan === 'yuzuru' || c.retirePlan === 'haigyo') out.push(...retire(s, ctx, c.retirePlan));
      else if (c.retirePlan === 'retire') out.push(...retire(s, ctx, 'emp'));
    } else if (c.phase === 'retired') {
      s.money.income = 180;
    }
    // 働き方の移り変わりを記録する（要約と検証に使う）
    const style = c.phase === 'retired' ? 'retired' : c.phase === 'registered' ? c.workStyle : null;
    if (style && style !== c.lastStyle) {
      (c.workHistory = c.workHistory ?? []).push({ age: s.age, style });
      c.lastStyle = style;
    }
    return out;
  },
};
