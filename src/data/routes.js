// 税理士になる道の割合。もとは国税庁の統計年報（令和7年度版）20-7「税理士登録者数」（各年度末）。
// 表にあるのは資格別の在籍数だけで、新しく登録した人の内訳はない。そこで、在籍数の増減に
// 道ごとの退出率（推定）で抜けた人数を足し戻して、新規の登録者の内訳を推定する。
// 統計年報の「試験免除者」は最終科目が免除による者で、国税OBのほか大学院の学位による免除も入る。
// ゲームでは大学院の免除は試験組の分かれ道なので、試験免除の一部を試験組に回す。

// 年度末の資格別の登録者数（人）。exempt＝試験免除者、tokubetsu＝特別試験合格者
const registrantsByFY = {
  2020: { exam: 35064, exempt: 30471, lawyer: 698, cpa: 10446, tokubetsu: 2719, total: 79404 },
  2021: { exam: 35010, exempt: 31340, lawyer: 703, cpa: 10759, tokubetsu: 2348, total: 80163 },
  2022: { exam: 34874, exempt: 32071, lawyer: 718, cpa: 11046, tokubetsu: 1981, total: 80692 },
  2023: { exam: 34736, exempt: 32795, lawyer: 741, cpa: 11349, tokubetsu: 1658, total: 81280 },
  2024: { exam: 34594, exempt: 33379, lawyer: 755, cpa: 11587, tokubetsu: 1380, total: 81696 },
  2025: { exam: 34411, exempt: 34261, lawyer: 800, cpa: 11882, tokubetsu: 1159, total: 82513 },
};

// 1年に抜ける割合（死亡・廃業）。在籍者の年齢の構成から置いた推定。OB は登録が遅く高齢が多い。
const exitRateEstimate = { value: { exam: 0.025, exempt: 0.035, cpa: 0.015, lawyer: 0.015 }, estimated: true, note: '在籍者の年齢の構成から置いた推定' };

// 試験免除の新規のうち、大学院の学位による免除の割合（推定）。残りを国税OBとする。
const gradShareOfExempt = { value: 0.4, estimated: true, note: '公表データなし' };

export function estimateNewRegistrantShares(byFY, exitRates) {
  const years = Object.keys(byFY).map(Number).sort((a, b) => a - b);
  const first = byFY[years[0]], last = byFY[years.at(-1)];
  const span = years.at(-1) - years[0];
  const fresh = {};
  for (const k of ['exam', 'exempt', 'cpa', 'lawyer']) {
    const net = (last[k] - first[k]) / span;
    const avgStock = (first[k] + last[k]) / 2;
    fresh[k] = Math.max(0, net + avgStock * exitRates[k]);
  }
  const total = Object.values(fresh).reduce((s, v) => s + v, 0);
  return Object.fromEntries(Object.entries(fresh).map(([k, v]) => [k, v / total]));
}

const fresh = estimateNewRegistrantShares(registrantsByFY, exitRateEstimate.value);
const SRC = 'nta-nenpo-zeirishi-r7';

export const ROUTES = {
  ids: ['exam', 'tax-office', 'cpa', 'lawyer'],
  registrantsByFY,
  exitRateEstimate,
  gradShareOfExempt,
  // 試験組の同期（志した人全体）のうち、受験をやめる人の割合（推定・公表データなし）
  peerQuitShare: { value: 0.55, estimated: true, note: '官報合格者は毎年500〜700人、受験者は3〜4万人。多くの人が途中でやめる' },
  // 通知弁護士（税理士法51条・延べ人員）
  noticeLawyersByFY: { 2020: 6442, 2021: 6937, 2022: 7494, 2023: 7981, 2024: 8331, 2025: 8702 },
  // 平成生まれが登録する道の割合（新規の登録者の内訳の推定）
  shareByEra: {
    heisei: {
      exam: { value: fresh.exam + fresh.exempt * gradShareOfExempt.value, src: SRC, estimated: true },
      'tax-office': { value: fresh.exempt * (1 - gradShareOfExempt.value), src: SRC, estimated: true },
      cpa: { value: fresh.cpa, src: SRC, estimated: true },
      lawyer: { value: fresh.lawyer, src: SRC, estimated: true },
    },
  },
  // 道ごとの女性の割合
  femaleShareByRoute: {
    heisei: {
      exam: { value: 0.26, src: 'nta-exam-r7', note: '官報合格者の女性 R7 141/527・R6 148/578' },
      'tax-office': { value: 0.35, estimated: true, note: '2025年度の国税専門官・税務職員の最終合格者の女性は約44%。長く勤めて登録する人の割合として低めに置いた' },
      cpa: { value: 0.24, src: 'fsa-cpa-r7', note: 'R7 合格者1,636人のうち女性392人' },
      lawyer: { value: 0.3, src: 'moj-shiho-r7', note: 'R7 司法試験の合格者の女性の割合 30.3%' },
    },
  },
  // 道が始まる年齢（志す年齢）の分布
  // 試験組で22歳以降に会計事務所や会社で働きながら志す人のうち、大学を出ている人の割合（推定。大学進学率 0.533 より高めに置く）
  examAdultUnivShare: { estimated: true, value: 0.65 },
  aspireAgeByRoute: {
    heisei: {
      exam: { estimated: true, dist: [{ from: 18, to: 22, w: 35 }, { from: 23, to: 29, w: 35 }, { from: 30, to: 39, w: 22 }, { from: 40, to: 49, w: 8 }] },
      'tax-office': { src: 'jinji-2025', note: '入る年齢（税務職員は高卒・国税専門官は大卒）。重みは2025年度の最終合格者数', dist: [{ from: 18, to: 18, w: 1329 }, { from: 22, to: 24, w: 3394 }] },
      cpa: { estimated: true, note: '会計士試験の勉強を始める年齢', dist: [{ from: 18, to: 21, w: 60 }, { from: 22, to: 26, w: 30 }, { from: 27, to: 35, w: 10 }] },
      lawyer: { estimated: true, note: '法科大学院か予備試験の勉強を始める年齢', dist: [{ from: 19, to: 22, w: 60 }, { from: 23, to: 27, w: 30 }, { from: 28, to: 35, w: 10 }] },
    },
  },
};
