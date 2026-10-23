// 税務署OB・公認会計士・弁護士の道。税理士になる前の長い年月を、それぞれの一次資料の数字で描く。
import { monthT } from './calendar.js';
import { sayFresh } from './text.js';
import { pickWeighted, randInt, normal } from './rng.js';
import { clamp, odds } from './odds.js';
import { TAX_OFFICE_TEXTS as TO, CPA_TEXTS as CT, LAWYER_TEXTS as LT } from '../data/events/routes-pre.js';
import { TO_EARLY, CPA_MOVE, LAWYER_TAX } from '../data/decisions/routes-pre.js';
import { applyMoneyOps, retirementLump } from './money.js';

// 国家公務員の定年：60歳になる年度の定年（1963〜64年生まれ61歳 … 1971年生まれ以降65歳）
export function teinenAge(birthYear, data) {
  return data.SEIDO.retirementAge(birthYear + 60);
}

// 公認会計士試験の合格（11月の発表）が2017-04-01以後なら、税理士になるのに税法の研修が要る
export function needsKenshu(passYear, data) {
  return passYear >= Number(data.SEIDO.cpaKenshuFrom.value.slice(0, 4));
}

const say = sayFresh;
const ln = (text, kind = 'ev') => ({ kind, text });
// 資格を取った行（画面は流れを止めて札を出す）。cpa＝公認会計士試験・law＝司法試験に受かる、ob＝税務署の人が税理士として登録する
const milestone = (l, kind) => ({ ...l, milestone: kind });
const pickBin = (rng, dist) => {
  const i = Number(pickWeighted(rng, Object.fromEntries(dist.map((b, k) => [k, b.w]))));
  return randInt(rng, dist[i].from, dist[i].to);
};
const SHITEI = ['上席', '統括官', '副署長', '署長'];

// 合格までの年数は、受験の力と学び方で決まる（推定）。指数分布の平均を受験の力で伸び縮みさせる
export const PASS_OR = { estimated: true, cpaMeanYears: 1.5, cpaAptitude: 0.5, cpaWorkFactor: 1.6, cpaWorkGivenAdult: 0.31, lawExtraYears: 3, lawRetryRate: 0.45, lawAptitude: 0.9 };

export function cpaStudyYears(s, rng) {
  const m = PASS_OR.cpaMeanYears * Math.exp(-PASS_OR.cpaAptitude * (s.aptitude ?? 0)) * (s.career.cpaMode === 'work' ? PASS_OR.cpaWorkFactor : 1);
  return clamp(1 + Math.floor(-Math.log(1 - rng()) * m), 1, 15);
}

// 司法試験：法科大学院（または予備試験）の数年のあと、初めての受験で受かる確率（R7 75.7%）を受験の力で動かす
export function lawStudyYears(s, rng, data) {
  let years = PASS_OR.lawExtraYears;
  let p = odds(data.PRE.lawyer.firstTryShare.value, Math.exp(PASS_OR.lawAptitude * (s.aptitude ?? 0)));
  while (rng() >= p && years < 15) { years += 1; p = odds(PASS_OR.lawRetryRate, Math.exp(PASS_OR.lawAptitude * (s.aptitude ?? 0))); }
  return years;
}

function register(s, ctx, workStyle, place, texts) {
  const c = s.career;
  c.phase = 'registered';
  c.registeredAt = s.age;
  c.workStyle = workStyle;
  c.firm = place === '税理士法人' ? 'hojin' : workStyle === 'kaigyo' ? 'own' : 'kojin';
  if (workStyle === 'kaigyo') c.kaigyoAt = s.age;
  c.workplaces.push(place);
  return [ln(say(texts, s, ctx), 'big')];
}

export const TAX_OFFICE_SYSTEM = {
  id: 'tax-office',
  plan(s, ctx) {
    if (s.route !== 'tax-office') return [];
    const c = s.career;
    const items = [];
    if (c.phase === 'pre' && s.age === s.aspireAge) {
      items.push({ t: monthT(4), type: 'fixed', run: (st, cx) => {
        const cc = st.career;
        cc.phase = 'tax-office';
        cc.post = '署員';
        cc.duty = cx.rng() < 0.75 ? 'fuka' : 'choshu';
        cc.shiteiYears = 0;
        cc.workplaces.push('税務署');
        return [ln(say(TO.entry[cc.taxOfficeEntry], st, cx), 'big'), ln(say(TO.firstPost, st, cx))];
      } });
    }
    if (c.phase !== 'tax-office') return items;
    if (c.taxOfficeYears > 0 && c.taxOfficeYears % 3 === 0 && ctx.rng() < 0.6) items.push({ t: monthT(7), type: 'fixed', run: (st, cx) => [ln(say(TO.tenkin, st, cx))] });
    if (c.fullExempt && s.age >= 55 && s.age < teinenAge(s.birthYear, ctx.data) && !s.decisionCounts.has('to-early')) items.push({ t: monthT(9), type: 'decision', ref: TO_EARLY });
    return items;
  },
  end(s, ctx) {
    if (s.route !== 'tax-office' || s.career.phase !== 'tax-office') return [];
    const c = s.career, D = ctx.data;
    const out = [];
    c.taxOfficeYears += 1;
    // 役職：在職年数の区切りで、上がる人の割合（推定）に従って上がる
    const P = D.PRE.taxOffice.postsByYears;
    const step = P.steps.find(x => x.years === c.taxOfficeYears);
    if (step && step.years > 0) {
      const prev = P.steps[P.steps.indexOf(step) - 1].post;
      if (c.post === prev && !c.noPromote && ctx.rng() < P.reachShare[step.post] / P.reachShare[prev]) {
        c.post = step.post;
        out.push(ln(say(TO.promote, s, ctx, { _post: step.post })));
      }
    }
    if (SHITEI.includes(c.post)) c.shiteiYears += 1;
    // 4月に採用されるので、年の終わりの勤続は数えた年数より3か月短い
    const served = c.taxOfficeYears - 0.25;
    const taxYears = c.duty === 'fuka' ? D.SEIDO.obTaxLawYears.value : D.SEIDO.obTaxLawYearsOther.value;
    if (!c.taxExempt && served >= taxYears) { c.taxExempt = true; out.push(ln(say(TO.taxExempt, s, ctx))); }
    // 会計の科目の免除：23年以上＋指定官職5年以上＋指定研修。指定官職に届かない人も28年で別の職の要件を満たすとみなす（簡略化）
    if (!c.fullExempt && served >= D.SEIDO.obAccountingYears.value && (c.shiteiYears >= D.SEIDO.obShiteiKanshokuYears.value || served >= 28)) {
      c.fullExempt = true;
      out.push(ln(say(TO.fullExempt, s, ctx), 'big'));
    }
    if (s.age === D.SEIDO.kanriKantokuAge.value && ['統括官', '副署長', '署長'].includes(c.post)) {
      c.post = '上席';
      out.push(ln(say(TO.kanriKantoku, s, ctx)));
    }
    const teinen = teinenAge(s.birthYear, D);
    if (c.fullExempt && (c.retireEarly || s.age >= teinen)) {
      out.push(ln(say(TO.retire, s, ctx, { _age: s.age })));
      // 税務署の退職金（国税専門官は大学卒、税務職員は高校卒の値）。勤続の年数で按分する
      const lump = retirementLump(s, D.MONEY, served);
      s.money.empYearsAtLump = s.money.empYears ?? 0;
      applyMoneyOps(s, [{ op: 'earn', amount: lump }], D);
      out.push(ln(`退職金は${Math.round(lump).toLocaleString('ja-JP')}万円でした。`));
      const style = ctx.rng() < 0.7 ? 'kaigyo' : 'shozoku';
      out.push(...register(s, ctx, style, style === 'kaigyo' ? '自分の事務所' : '税理士法人', TO.register).map(l => milestone(l, 'ob')));
    }
    return out;
  },
};

export const CPA_SYSTEM = {
  id: 'cpa',
  plan(s, ctx) {
    if (s.route !== 'cpa') return [];
    const c = s.career, D = ctx.data;
    const items = [];
    if (c.phase === 'pre' && s.age === s.aspireAge) {
      items.push({ t: monthT(4), type: 'fixed', run: (st, cx) => {
        const cc = st.career;
        cc.phase = 'cpa-exam';
        // 大学生のうちは専念。社会人から目指す人の約3割が働きながら（合格者の働きながらの割合 R7 11.4% に合わせた推定）
        cc.cpaMode = st.age >= 23 && cx.rng() < PASS_OR.cpaWorkGivenAdult ? 'work' : 'senen';
        // 合格は原則20歳以上（R7 の20歳未満の合格は1.6%）。まれに早く受かる人もいる
        const early = cx.rng() < 0.02;
        cc.cpaPassAge = clamp(Math.max(st.age + cpaStudyYears(st, cx.rng), early ? 0 : 20), st.age + 1, 54);
        return [ln(say(CT.aspire, st, cx), 'big')];
      } });
      return items;
    }
    if (c.phase === 'cpa-exam' && s.age === c.cpaPassAge) {
      items.push({ t: monthT(11), type: 'fixed', run: (st, cx) => {
        const cc = st.career;
        cc.phase = 'cpa';
        cc.cpaPassYear = cx.year;
        cc.cpaShikakuAge = st.age + D.PRE.cpa.gyomuHojoYears.value;
        cc.auditTarget = pickBin(cx.rng, D.PRE.cpa.auditFirmYears.dist);
        cc.auditFirm = pickWeighted(cx.rng, D.PRE.cpa.auditFirmSize.dist);
        cc.workplaces.push(CT.firmLabel[cc.auditFirm]);
        if (st.flags.has('will-univ') && st.age >= 18 && st.age <= 22) cc.inSchoolPass = true;
        return [milestone(ln(cc.inSchoolPass ? say(CT.passInSchool, st, cx) : say(CT.pass, st, cx), 'big'), 'cpa'), ln(say(CT.audit[cc.auditFirm], st, cx))];
      } });
    } else if (c.phase === 'cpa-exam' && ctx.rng() < 0.5) {
      items.push({ t: monthT(5), type: 'fixed', run: (st, cx) => [ln(say(CT.study, st, cx))] });
    }
    if (c.phase === 'cpa' && c.auditYears >= c.auditTarget && s.age >= c.cpaShikakuAge && c.cpaMove !== 'go'
      && (c.lastMoveAsk == null || s.age - c.lastMoveAsk >= 3)) {
      c.lastMoveAsk = s.age;
      items.push({ t: monthT(6), type: 'decision', ref: { ...CPA_MOVE, maxPerLife: 6, certainSkip: st => (st.career.auditYears >= 20 ? 'hojin' : null) } });
    }
    return items;
  },
  end(s, ctx) {
    if (s.route !== 'cpa' || s.career.phase !== 'cpa') return [];
    const c = s.career, D = ctx.data;
    const out = [];
    c.auditYears += 1;
    if (s.age === c.cpaShikakuAge) {
      if (needsKenshu(c.cpaPassYear, D)) { c.kenshuAge = s.age; out.push(ln(say(CT.kenshu, s, ctx))); }
      out.push(ln(say(CT.shikaku, s, ctx)));
    }
    if (c.cpaMove === 'hojin' || c.cpaMove === 'kaigyo') {
      out.push(...register(s, ctx, c.cpaMove === 'kaigyo' ? 'kaigyo' : 'shozoku', c.cpaMove === 'kaigyo' ? '自分の事務所' : '税理士法人', CT.register));
    }
    return out;
  },
};

export const LAWYER_SYSTEM = {
  id: 'lawyer',
  plan(s, ctx) {
    if (s.route !== 'lawyer') return [];
    const c = s.career, D = ctx.data;
    const items = [];
    if (c.phase === 'pre' && s.age === s.aspireAge) {
      items.push({ t: monthT(4), type: 'fixed', run: (st, cx) => {
        const cc = st.career;
        cc.phase = 'law-exam';
        cc.lawPassAge = clamp(st.age + lawStudyYears(st, cx.rng, D), st.age + 2, 50);
        if (st.age <= 22) st.schoolEndAge = 24;
        return [ln(say(LT.aspire, st, cx), 'big')];
      } });
      return items;
    }
    if (c.phase === 'law-exam' && s.age === c.lawPassAge) {
      items.push({ t: monthT(11), type: 'fixed', run: (st, cx) => {
        const out = [milestone(ln(say(LT.pass, st, cx), 'big'), 'law')];
        if (cx.rng() < cx.data.PRE.lawyer.taxLawElectiveShare.value * 5) { st.flags.add('tax-law-elective'); out.push(ln(say(LT.taxLaw, st, cx))); }
        st.career.lawPassed = true;
        return out;
      } });
    } else if (c.phase === 'law-exam' && !c.lawPassed && ctx.rng() < 0.5) {
      items.push({ t: monthT(5), type: 'fixed', run: (st, cx) => [ln(say(LT.study, st, cx))] });
    }
    if (c.phase === 'lawyer' && s.age - c.lawyerSince >= c.firmTarget && (c.lawyerTax == null || (c.lawyerTax === 'notice' && s.age - c.lawyerTaxAskAge >= 5))) {
      items.push({ t: monthT(5), type: 'decision', ref: { ...LAWYER_TAX, certainSkip: st => ((st.decisionCounts.get('lawyer-tax') ?? 0) >= 3 ? 'register' : null) } });
    }
    return items;
  },
  end(s, ctx) {
    if (s.route !== 'lawyer') return [];
    const c = s.career, D = ctx.data;
    const out = [];
    if (c.phase === 'law-exam' && c.lawPassed && s.age === c.lawPassAge + D.PRE.lawyer.shushuYears) {
      c.phase = 'lawyer';
      c.lawyerSince = s.age;
      c.firmTarget = pickBin(ctx.rng, D.PRE.lawyer.firmYears.dist);
      c.workplaces.push('法律事務所');
      out.push(ln(say(LT.shushu, s, ctx), 'big'));
    } else if (c.phase === 'lawyer') {
      if (c.lawyerTax === 'notice' && c.noticeAge == null) { c.noticeAge = s.age; out.push(ln(say(LT.notice, s, ctx))); }
      if (c.lawyerTax === 'register') out.push(...register(s, ctx, 'kaigyo', '法律事務所（税理士として登録）', LT.register));
    }
    return out;
  },
};
