// お金の計算（お金と転機の設計書4）。金額は万円。貯蓄はマイナスにせず、足りない分は暮らしの借金にする。
// 自己破産は描かない：返せない年は返済を延ばして文に出す。家のローンは亡くなると消える（団体信用生命保険）。
import { DATA } from '../data/index.js';

export const LOAN_LABEL = { shogakukin: '奨学金', kaigyo: '開業資金', jutaku: '家のローン', yuzuriuke: '事務所の譲り受け', seikatsu: '暮らしの借金' };

const married = s => !!(s.spouse && s.spouse.alive && !s.spouse.divorced);
const schoolEnd = s => s.schoolEndAge ?? (s.flags.has('will-univ') ? 22 : 18);
const inSchool = s => s.age < schoolEnd(s) && !married(s);
// 親の家で暮らしている：一人暮らし・結婚・独身寮などの行がまだなく、22歳まで・親が生きている（場面の絵と同じ決まり）
export const livingAtHome = s => !s.home.leftParents && !s.spouse && s.age < 22 && s.parents.some(p => p.alive);

export function initMoney(s, data = DATA) {
  const M = data.MONEY;
  const t = Math.min(5, Math.max(1, s.tier ?? 3)) - 1;
  s.money.house = { income: M.householdIncome.value[t], savings: M.householdSavingsStart.value[t] };
}

// startAge：この年齢から返し始める（奨学金は学校を出てから）
export function addLoan(s, kind, amount, years, startAge = null) {
  if (amount <= 0) return;
  const per = Math.max(1, Math.round(amount / Math.max(1, years)));
  const l = s.money.loans.find(x => x.kind === kind && x.left > 0);
  if (l) { l.left += amount; l.perYear = Math.max(l.perYear, Math.round(l.left / Math.max(1, years))); } else s.money.loans.push({ kind, left: amount, perYear: per, startAge });
  s.money.everBorrowed = true;
  // 新しく借りたら「借入金を返し終えた年」は消える
  s.money.debtFreeAge = null;
}

// お金を出す。from が 'house' なら家の貯蓄から（0で止める）、'self' なら自分の貯蓄から（足りない分は暮らしの借金）
export function spend(s, amount, from = 'self', data = DATA, reason = null) {
  if (amount <= 0) return;
  const m = s.money;
  if (reason) m.shocks.push({ reason, age: s.age, amount: Math.round(amount) });
  if (from === 'house') { m.house.savings = Math.max(0, m.house.savings - amount); return; }
  if (m.savings >= amount) { m.savings -= amount; return; }
  const short = amount - m.savings;
  m.savings = 0;
  addLoan(s, 'seikatsu', short, data.MONEY.household.value.livingDebtYears);
  m.pending.push({ kind: 'bad', text: `暮らしが回らず、${Math.round(short).toLocaleString('ja-JP')}万円を借りました。` });
}

export function earn(s, amount) {
  if (amount > 0) s.money.savings += amount;
}

// 5歳ごとの年齢の表を、その年齢の値にする（間はまっすぐつなぐ・端はそのまま）
function curve(tbl, age) {
  const ks = Object.keys(tbl).map(Number).sort((a, b) => a - b);
  if (age <= ks[0]) return tbl[ks[0]];
  if (age >= ks.at(-1)) return tbl[ks.at(-1)];
  const i = ks.findIndex(k => k > age);
  const a = ks[i - 1], b = ks[i];
  return tbl[a] + ((tbl[b] - tbl[a]) * (age - a)) / (b - a);
}

// その年の年収（額面）。立場と年齢で決まり、頑張り具合が昇給の分にかかる（お金と転機の設計書4.1）
export function incomeOf(s, data = DATA) {
  const M = data.MONEY, W = M.wage.value, c = s.career;
  const raise = M.effort.value[s.money.effort]?.raise ?? 1;
  const grow = (tbl, age) => { const c0 = curve(tbl, 20); return Math.round(c0 + (curve(tbl, age) - c0) * raise); };
  if (c.phase === 'retired') return 0;
  const v = baseIncome(s, M, W, c, grow, raise);
  // 子育てとの両立（育休・時短）の年は年収が下がる
  const f = m => (m.incomeFactor && s.age <= m.incomeFactor.until ? m.incomeFactor.factor : 1);
  return Math.round(v * f(s.money));
}

function baseIncome(s, M, W, c, grow, raise) {
  if (c.phase === 'registered') {
    // 税理士として登録した弁護士は、弁護士の年収が基本（開業していれば税の顧問先の分を足す）
    if (s.route === 'lawyer' && c.workStyle !== 'kigyonai') {
      const lw = grow(W.zeirishiByAge, s.age) * (W.lawyerMean / W.zeirishiMean);
      return Math.round(c.workStyle === 'kaigyo' ? lw + M.kaigyo.value.perClient * (c.clients ?? 0) : lw * (M.styleFactor.value[c.workStyle] ?? 1));
    }
    if (c.workStyle === 'kaigyo') return M.kaigyo.value.base + M.kaigyo.value.perClient * (c.clients ?? 0);
    const f = M.styleFactor.value[c.workStyle] ?? 1;
    return Math.round(grow(W.zeirishiByAge, s.age) * f);
  }
  if (c.phase === 'tax-office') { const T = M.taxOfficePay.value; return Math.min(T.max, Math.round(T.start + T.perYear * (c.taxOfficeYears ?? 0) * raise)); }
  if (c.phase === 'cpa') return grow(W.zeirishiByAge, s.age);
  if (c.phase === 'lawyer') return Math.round(grow(W.zeirishiByAge, s.age) * (W.lawyerMean / W.zeirishiMean));
  if (['aspirant', 'examinee', 'passed'].includes(c.phase)) return c.job === 'jimusho' ? grow(W.keiriByAge, s.age) : c.job === 'keiri' ? grow(W.keiriByAge, s.age) * s.money.companyFactor : 0;
  // 志す前：学校を出たら会社で働く（会社員）。就職先で年収の倍率が変わる
  if (c.phase === 'pre' && !inSchool(s) && (s.flags.has('shushoku') || s.age >= schoolEnd(s))) return grow(W.keiriByAge, s.age) * s.money.companyFactor;
  return 0;
}

const debtTotal = s => s.money.loans.reduce((a, l) => a + Math.max(0, l.left), 0);

// 年金：基礎年金に、勤めた年数に応じた厚生年金の分を足す（勤めが長い人で平均の額）。配偶者が65歳を過ぎていれば配偶者の基礎年金も入る
export function pensionOf(s, M) {
  const P = M.pension.value;
  const own = P.kokumin + (P.employee - P.kokumin) * Math.min(1, (s.money.empYears ?? 0) / M.household.value.empYearsFull);
  const spouse = married(s) && s.age + (s.birthYear - s.spouse.birthYear) >= 65 ? P.kokumin : 0;
  return Math.round(own + spouse);
}

// 退職金：勤続の年数で按分する（定年まで勤めた人で平均の額。按分は推定）
export function retirementLump(s, M, years) {
  const base = M.retirement.value[s.flags.has('will-univ') ? 'univ' : 'kou'];
  return Math.round(base * Math.min(1, Math.max(0, years) / M.household.value.retireFullYears));
}

// 勤め（厚生年金に入る働き方）か
function employed(s) {
  const c = s.career;
  if (c.phase === 'registered') return c.workStyle !== 'kaigyo' && s.route !== 'lawyer';
  if (c.phase === 'tax-office' || c.phase === 'cpa') return true;
  if (['aspirant', 'examinee', 'passed'].includes(c.phase)) return c.job === 'jimusho' || c.job === 'keiri';
  return c.phase === 'pre';
}

const kidsAtHome = s => s.children.filter(c => c.alive !== false && !s.home.kidsOut.has(c.name) && s.age - c.bornAge < 22);
// 子の費用：1人ごとの費用（世帯の人数ごとの費用の1人分の差）と、大学に通う年ごろの子の学費
function kidsCostOf(s, M) {
  const kids = kidsAtHome(s);
  const per = M.livingCost.value[2] - M.livingCost.value[1];
  return kids.length * per + kids.filter(c => s.age - c.bornAge >= 18).length * M.household.value.kidUniv;
}
// 大人の暮らしの費用（本人・配偶者・一緒に暮らす親）
function adultCostOf(s, M) {
  const parents = s.home.parentsBack ? s.parents.filter(p => p.alive).length : 0;
  return M.livingCost.value[Math.min(5, 1 + (married(s) ? 1 : 0) + parents)];
}
function livingCostOf(s, M) {
  const spendRate = M.effort.value[s.money.effort]?.spend ?? 1;
  return adultCostOf(s, M) * spendRate + kidsCostOf(s, M);
}

// 暮らしの費用：大人の分は、人数ごとの費用と、手取り×平均消費性向（＋消費支出のほかの出費）の大きいほう（年収の高い家ほど多く使う）。
// 子の分は、どちらを取っても上に足す（子の数だけ暮らしの費用が増える）
function livingOf(s, M, net) {
  const spendRate = M.effort.value[s.money.effort]?.spend ?? 1;
  return Math.max(adultCostOf(s, M) * spendRate, net * (M.consumptionRate.value + M.household.value.otherOutflow) * spendRate) + kidsCostOf(s, M);
}

// 同じ文を一生に二度出さない（二度目は「また、」・三度目は出さない）
function fresh(s, line) {
  for (const t of [line.text, `また、${line.text}`]) if (!s.usedTexts.has(t)) { s.usedTexts.add(t); return { ...line, text: t }; }
  return null;
}

// 年の終わり（設計書4.2）：年収→手取り（＋配偶者）→暮らしの費用→返済（返し終えたら一行）→貯蓄
export function updateMoney(s, data = DATA) {
  const M = data.MONEY;
  const m = s.money;
  const out = [];
  if (inSchool(s)) m.house.savings += m.house.income * M.takeHome.value * M.household.value.saveRate;
  const retired = s.career.phase === 'retired';
  if (!retired && m.income > 0 && employed(s)) m.empYears = (m.empYears ?? 0) + 1;
  // 介護を受ける親が亡くなったら、介護の費用は止まる
  if (m.care && !s.parents.some(p => p.alive)) m.care = null;
  if (retired) m.pension = pensionOf(s, M);
  let net = retired ? m.pension : m.income * M.takeHome.value;
  // 配偶者の収入：小さな子（6歳未満）がいなければ勤め、いればパート（推定）。65歳まで
  if (married(s) && s.age + (s.birthYear - s.spouse.birthYear) < 65) net += s.children.some(c => s.age - c.bornAge < 6) ? M.spouseIncome.value.part : M.spouseIncome.value.work;
  let living = 0;
  if (inSchool(s)) living = 0; // 学校に通う間の暮らしは家が持つ（学費と下宿の費用は分かれ道と仕組みが家の貯蓄から出す）
  else if (livingAtHome(s)) living = m.income > 0 ? M.livingCost.value[1] * M.household.value.atHomeShare : 0;
  else living = livingOf(s, M, net);
  // 介護の費用と、借入の利息（家のローン）。引退後の切り詰めはこれも含めた全体にかける
  if (m.care && s.age < m.care.until) living += m.care.perYear;
  for (const l of m.loans) if (l.left > 0 && l.interest && (l.startAge == null || s.age >= l.startAge)) living += l.interest;
  // 引退して貯蓄が少なくなったら、年金と貯蓄の1割ほどの範囲に暮らしを切り詰める（一生に一度、一行）。暮らしの借金はふくらませない
  if (retired && living > net && m.savings < living * 3) {
    living = Math.max(net, Math.min(livingCostOf(s, M) * 0.7, net + m.savings * 0.12));
    if (!m.cutBack) { m.cutBack = true; const ln = fresh(s, { kind: 'ev', text: '年金の範囲で暮らせるよう、暮らしを切り詰めるようになりました。' }); if (ln) out.push(ln); }
  }
  let cash = m.savings + net - living;
  const hadDebt = debtTotal(s) > 0;
  // 引退したら、退職金などの貯蓄で家のローンの残りをまとめて返す（残る貯蓄が暮らしの3年分あれば）
  const house = m.loans.find(l => l.kind === 'jutaku' && l.left > 0);
  if (retired && house && cash - house.left >= living * 3) { house.perYear = house.left; }
  for (const l of m.loans) {
    if (l.left <= 0) continue;
    if (l.startAge != null && s.age < l.startAge) continue;
    const due = Math.min(l.left, l.perYear);
    if (l.kind !== 'seikatsu' && cash < due) {
      // 返せない年は延ばす（自己破産は描かない）
      if (!l.extended) { l.extended = true; const ln = fresh(s, { kind: 'bad', text: `${LOAN_LABEL[l.kind]}の返済を延ばしてもらいました。` }); if (ln) out.push(ln); }
      continue;
    }
    const pay = Math.min(due, Math.max(0, cash));
    if (pay <= 0) continue;
    l.left -= pay;
    cash -= pay;
    if (l.left <= 0) {
      l.left = 0;
      m.paid.push({ kind: l.kind, age: s.age });
      const ln = fresh(s, { kind: 'warm', text: `${LOAN_LABEL[l.kind]}を返し終えました。` });
      if (ln) out.push(ln);
    }
  }
  m.loans = m.loans.filter(l => l.left > 0);
  // 収入のない年の不足は、まず親の仕送り（親が生きていて、家の貯蓄があるうち。一生に一行）
  if (cash < 0 && m.income <= 0 && !retired && s.parents.some(p => p.alive) && m.house.savings > 0) {
    const x = Math.min(-cash, m.house.savings);
    m.house.savings -= x;
    cash += x;
    if (!m.shiokuri) { m.shiokuri = true; const ln = fresh(s, { kind: 'ev', text: '親が仕送りをしてくれました。' }); if (ln) out.push(ln); }
  }
  // 暮らしの借金には上限があり、それより先は借りずに暮らしを切り詰める（一生に一行）
  if (cash < 0) {
    const owed = m.loans.filter(l => l.kind === 'seikatsu').reduce((a, l) => a + l.left, 0);
    const room = Math.max(0, M.household.value.livingDebtCap - owed);
    if (-cash > room) {
      if (!m.capped) { m.capped = true; const ln = fresh(s, { kind: 'ev', text: 'これ以上は借りず、暮らしを切り詰めてしのぎました。' }); if (ln) out.push(ln); }
      cash = -room;
    }
  }
  if (cash < 0) { m.savings = 0; spend(s, -cash, 'self', data); } else m.savings = cash;
  // 80歳で家のローンが残っていれば、貯蓄でまとめて返すか、家を売って返す（団体信用生命保険は80歳まで）
  const home80 = m.loans.find(l => l.kind === 'jutaku' && l.left > 0);
  if (home80 && s.age >= 80) out.push(...closeHouseLoan(s, M, home80));
  // 引退して貯蓄が尽き、暮らしの借金が残るとき：子が肩代わりするか、家を売って返す（自己破産は描かない。一生に一度）
  const living_ = m.loans.find(l => l.kind === 'seikatsu' && l.left > 0);
  if (retired && living_ && m.savings <= 0 && !m.rescued) {
    const kids = s.children.some(c => c.alive !== false);
    if (kids || s.flags.has('ie')) {
      m.rescued = true;
      living_.left = 0;
      m.paid.push({ kind: 'seikatsu', age: s.age });
      if (kids) { const ln = fresh(s, { kind: 'ev', text: '子どもが、暮らしの借金を代わりに返してくれました。' }); if (ln) out.push(ln); } else out.push(...sellHouse(s, M, '暮らしの借金'));
      m.loans = m.loans.filter(l => l.left > 0);
    }
  }
  if (hadDebt && debtTotal(s) === 0) m.debtFreeAge = s.age;
  if (!retired && m.income > (m.maxIncome ?? 0)) { m.maxIncome = m.income; m.maxIncomeAge = s.age; }
  for (const p of m.pending.splice(0)) { const ln = fresh(s, p); if (ln) out.push(ln); }
  return out;
}

export function moneyView(s, data = DATA) {
  const m = s.money;
  const child = m.income <= 0 && inSchool(s);
  const retired = s.career.phase === 'retired';
  const loans = m.loans.filter(l => l.left > 0).sort((a, b) => b.left - a.left);
  return {
    incomeLabel: child ? '家の年収' : retired ? '年金' : '年収',
    income: Math.round(child ? m.house.income : retired ? pensionOf(s, data.MONEY) : m.income),
    savingsLabel: child ? '家の貯蓄' : '貯蓄',
    savings: Math.round(child ? m.house.savings : m.savings),
    debt: Math.round(debtTotal(s)),
    debtReason: loans.length ? LOAN_LABEL[loans[0].kind] : null,
  };
}

// 暮らしの借金が大きいときだけ、心と命の数値に響かせる（開業資金・家のローン・奨学金は入れない）
export function debtFactor(s, data = DATA) {
  const left = s.money.loans.filter(l => l.kind === 'seikatsu').reduce((a, l) => a + l.left, 0);
  return left >= data.MONEY.household.value.livingDebtAlarm ? 1.5 : 1;
}
export function moneyMood(s, data = DATA) {
  return (debtFactor(s, data) > 1 ? -6 : 0) + (s.money.savings >= 1000 ? 2 : 0);
}

export function moneySummary(s) {
  const m = s.money;
  // 家のローンは亡くなると消える
  const atDeath = m.loans.filter(l => l.kind !== 'jutaku').reduce((a, l) => a + l.left, 0);
  const debtKinds = Object.fromEntries(m.loans.filter(l => l.kind !== 'jutaku' && l.left > 0).map(l => [l.kind, Math.round(l.left)]));
  const jutakuAtDeath = Math.round(m.loans.filter(l => l.kind === 'jutaku').reduce((a, l) => a + l.left, 0));
  return { debtKinds, jutakuAtDeath, dansin: m.dansin ?? 0, maxIncome: Math.round(m.maxIncome ?? 0), maxIncomeAge: m.maxIncomeAge ?? null, finalSavings: Math.round(m.savings), debtAtDeath: Math.round(atDeath), debtFreeAge: m.debtFreeAge ?? null, everBorrowed: !!m.everBorrowed, shocks: m.shocks.map(x => ({ ...x })), paid: m.paid.map(x => ({ ...x })) };
}

// 分かれ道と出来事のお金の動き（データの側は ops を返すだけで、ここで動かす）
// op：spend { amount, reason, from } ・earn { amount } ・loan { kind, amount, years, startAge } ・house（頭金を貯蓄から、足りない分はローンに）・
//     spendUpTo { amount }（貯蓄の範囲だけ使う）・prepay { kind, amount }（繰り上げ返済）・care { perYear, years }（介護の年の費用）・incomeFactor { factor, years }（育休・時短の年収）・effort { k }・company { factor }
export function applyMoneyOps(s, ops = [], data = DATA) {
  const m = s.money;
  for (const o of ops) {
    if (o.op === 'spend') spend(s, o.amount, o.from ?? 'self', data, o.reason ?? null);
    else if (o.op === 'earn') earn(s, o.amount);
    else if (o.op === 'spendUpTo') m.savings = Math.max(0, m.savings - o.amount); // 貯蓄の範囲だけ使う（借りない）
    else if (o.op === 'loan') addLoan(s, o.kind, o.amount, o.years, o.startAge ?? null);
    else if (o.op === 'house') {
      // 借入金は元本（毎年の返済を金利で割り戻した額）。返済のうち利息の分は、返す年ごとに暮らしの費用に入る
      const H = data.MONEY.housing.value;
      const down = Math.min(m.savings, H.down);
      m.savings -= down;
      const principal = Math.round(H.perYear * (1 - (1 + H.rate) ** -H.years) / H.rate + (H.down - down));
      addLoan(s, 'jutaku', principal, H.years);
      const l = m.loans.find(x => x.kind === 'jutaku' && x.left > 0);
      l.interest = (l.interest ?? 0) + Math.max(0, H.perYear - Math.round(principal / H.years));
    } else if (o.op === 'care') m.care = { perYear: o.perYear, until: s.age + o.years };
    else if (o.op === 'incomeFactor') m.incomeFactor = { factor: o.factor, until: s.age + o.years - 1 };
    else if (o.op === 'prepay') {
      // 繰り上げ返済：貯蓄から、借入の残りの分まで
      const l = m.loans.find(x => x.kind === o.kind && x.left > 0);
      const x = l ? Math.min(o.amount, m.savings, l.left) : 0;
      if (x > 0) { m.savings -= x; l.left -= x; }
    } else if (o.op === 'effort') m.effort = o.k;
    else if (o.op === 'company') m.companyFactor = o.factor;
  }
}

// 家を売る：家のローンの残りを返し、余りは貯蓄に（古い家でも残りのローンは返せる値で売れたとする・推定）。一行
function sellHouse(s, M, what) {
  const m = s.money;
  const l = m.loans.find(x => x.kind === 'jutaku' && x.left > 0);
  const left = l ? l.left : 0;
  if (l) { l.left = 0; m.paid.push({ kind: 'jutaku', age: s.age }); }
  m.savings += Math.max(0, M.household.value.houseSale - left);
  s.flags.delete('ie');
  m.loans = m.loans.filter(x => x.left > 0);
  const text = what ? (left > 0 ? `家を売って小さな部屋に移り、家のローンと${what}を返しました。` : `家を売って小さな部屋に移り、${what}を返しました。`) : '家を売って小さな部屋に移り、家のローンの残りを返しました。';
  const ln = fresh(s, { kind: 'ev', text });
  return ln ? [ln] : [];
}

// 80歳で残っている家のローン：貯蓄で足りればまとめて返し、足りなければ家を売って返す
function closeHouseLoan(s, M, l) {
  const m = s.money;
  if (m.savings < l.left) return sellHouse(s, M, null);
  m.savings -= l.left;
  l.left = 0;
  m.paid.push({ kind: 'jutaku', age: s.age });
  m.loans = m.loans.filter(x => x.left > 0);
  const ln = fresh(s, { kind: 'ev', text: '家のローンの残りを、貯蓄でまとめて返しました。' });
  return ln ? [ln] : [];
}

// 亡くなったとき：家のローンの残りは、団体信用生命保険で返される（一行）
export function settleAtDeath(s, data = DATA) {
  const m = s.money;
  const l = m.loans.find(x => x.kind === 'jutaku' && x.left > 0);
  if (!l) return [];
  m.dansin = Math.round(l.left);
  l.left = 0;
  m.loans = m.loans.filter(x => x.left > 0);
  return [{ kind: 'ev', text: `家のローンの残り${m.dansin.toLocaleString('ja-JP')}万円は、団体信用生命保険で返されました。` }];
}
