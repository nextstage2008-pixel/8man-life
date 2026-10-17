// 人生全般の統計（平成生まれ）。2026-10-17 に一次資料から写した。

export const CAUSES = {
  cancer: { label: 'がん' },
  heart: { label: '心臓の病気' },
  senility: { label: '老衰' },
  stroke: { label: '脳卒中' },
  pneumonia: { label: '肺炎' },
  accident: { label: '不慮の事故' },
  liver: { label: '肝臓の病気' },
  congenital: { label: '生まれつきの病気' },
  perinatal: { label: '生まれてすぐの病気' },
  sids: { label: '乳幼児突然死症候群' },
  influenza: { label: 'インフルエンザ' },
  neoplasm: { label: 'そのほかの腫瘍' },
  other: { label: 'そのほかの病気' },
  suicide: { label: '自殺' },
};

// 令和6年 人口動態統計月報年計（概数）第7表：年齢（5歳階級）別の死亡数と、死因の上位5位の死亡数（男女計）。
// perinatal は「呼吸障害等」と「出血性障害等」を合わせたもの。
const DEATHS_2024 = [
  { from: 0, to: 0, total: 1266, top: { congenital: 401, perinatal: 232 + 51, accident: 50, sids: 48 } },
  { from: 1, to: 4, total: 519, top: { congenital: 104, accident: 49, cancer: 47, heart: 31, influenza: 22 } },
  { from: 5, to: 9, total: 349, top: { cancer: 81, accident: 46, congenital: 40, influenza: 21, neoplasm: 13 } },
  { from: 10, to: 14, total: 513, top: { suicide: 132, cancer: 95, accident: 51, congenital: 35, heart: 21 } },
  { from: 15, to: 19, total: 1284, top: { suicide: 627, accident: 166, cancer: 120, heart: 46, congenital: 38 } },
  { from: 20, to: 24, total: 2169, top: { suicide: 1219, accident: 241, cancer: 158, heart: 72, congenital: 33 } },
  { from: 25, to: 29, total: 2298, top: { suicide: 1124, accident: 247, cancer: 223, heart: 104, stroke: 45 } },
  { from: 30, to: 34, total: 2763, top: { suicide: 1120, cancer: 428, heart: 211, accident: 178, stroke: 92 } },
  { from: 35, to: 39, total: 4232, top: { suicide: 1209, cancer: 902, heart: 371, accident: 269, stroke: 258 } },
  { from: 40, to: 44, total: 6832, top: { cancer: 1768, suicide: 1408, heart: 682, stroke: 588, accident: 372 } },
  { from: 45, to: 49, total: 12400, top: { cancer: 3913, suicide: 1720, heart: 1423, stroke: 1083, liver: 716 } },
  { from: 50, to: 54, total: 22117, top: { cancer: 7699, heart: 2811, suicide: 1981, stroke: 1850, liver: 1186 } },
  { from: 55, to: 59, total: 29960, top: { cancer: 11330, heart: 3967, stroke: 2204, suicide: 1714, liver: 1472 } },
  { from: 60, to: 64, total: 41868, top: { cancer: 17061, heart: 5427, stroke: 2744, liver: 1717, suicide: 1382 } },
  { from: 65, to: 69, total: 65435, top: { cancer: 27568, heart: 8025, stroke: 4092, accident: 1896, liver: 1820 } },
  { from: 70, to: 74, total: 125645, top: { cancer: 50541, heart: 15126, stroke: 8067, pneumonia: 4021, accident: 3672 } },
  { from: 75, to: 79, total: 187767, top: { cancer: 67334, heart: 23020, stroke: 12402, pneumonia: 7638, accident: 5801 } },
  { from: 80, to: 84, total: 263882, top: { cancer: 73564, heart: 35044, senility: 18273, stroke: 17583, pneumonia: 13995 } },
  { from: 85, to: 89, total: 320640, top: { cancer: 64695, heart: 47250, senility: 41007, stroke: 21342, pneumonia: 19813 } },
  { from: 90, to: 94, total: 306452, top: { senility: 66648, heart: 49362, cancer: 41488, pneumonia: 19480, stroke: 19375 } },
  { from: 95, to: 99, total: 164951, top: { senility: 53517, heart: 27353, cancer: 13343, pneumonia: 9708, stroke: 9202 } },
  { from: 100, to: 110, total: 41263, top: { senility: 19719, heart: 5848, pneumonia: 1910, stroke: 1818, cancer: 1715 } },
];

// 自殺は別の仕組み（統計の率×心の状態の倍率）で起こすので、死因の表からは外す。
// 上位5位に入らない死因は「そのほかの病気」にまとめる。
function buildCauseByAge(rows) {
  return rows.map(({ from, to, total, top }) => {
    const causes = {};
    let listed = 0;
    for (const [k, n] of Object.entries(top)) {
      listed += n;
      if (k !== 'suicide') causes[k] = n;
    }
    causes.other = total - listed;
    return { from, to, causes };
  });
}

// 令和6年 第7表（男・女）の自殺の死亡率（人口10万対）。上位5位に入らない年齢は推定。
const SUICIDE_MALE = [
  { from: 0, to: 9, per100k: 0 },
  { from: 10, to: 14, per100k: 2.0 }, { from: 15, to: 19, per100k: 11.0 }, { from: 20, to: 24, per100k: 26.0 },
  { from: 25, to: 29, per100k: 23.4 }, { from: 30, to: 34, per100k: 26.2 }, { from: 35, to: 39, per100k: 26.1 },
  { from: 40, to: 44, per100k: 28.0 }, { from: 45, to: 49, per100k: 28.9 }, { from: 50, to: 54, per100k: 28.7 },
  { from: 55, to: 59, per100k: 29.1 },
  { from: 60, to: 69, per100k: 24, estimated: true }, { from: 70, to: 79, per100k: 26, estimated: true }, { from: 80, to: 110, per100k: 28, estimated: true },
];
const SUICIDE_FEMALE = [
  { from: 0, to: 9, per100k: 0 },
  { from: 10, to: 14, per100k: 3.2 }, { from: 15, to: 19, per100k: 12.6 }, { from: 20, to: 24, per100k: 16.6 },
  { from: 25, to: 29, per100k: 14.5 }, { from: 30, to: 34, per100k: 11.3 }, { from: 35, to: 39, per100k: 10.5 },
  { from: 40, to: 44, per100k: 9.9 }, { from: 45, to: 49, per100k: 11.0 }, { from: 50, to: 54, per100k: 12.4 },
  { from: 55, to: 59, per100k: 11.9 }, { from: 60, to: 64, per100k: 10.5 },
  { from: 65, to: 79, per100k: 11, estimated: true }, { from: 80, to: 110, per100k: 11, estimated: true },
];

export const LIFE = {
  heisei: {
    // 2000年前後生まれの一生の平均寿命の代わりに、社人研の令和5年推計（死亡中位）の長期の値を使う
    e0: {
      male: { value: 85.89, src: 'ipss-suikei-r5', estimated: true, note: '期間の平均寿命の長期の値をコーホートの代わりに使った' },
      female: { value: 91.94, src: 'ipss-suikei-r5', estimated: true },
    },
    // 2000年の乳児死亡率（出生千対3.2）
    infantMortality: { value: 0.0032, src: 'mhlw-jinko-kakutei-r6' },
    causeByAge: buildCauseByAge(DEATHS_2024),
    causeSrc: 'mhlw-jinko-gaisu-r6',
    suicideRateByAgeSex: { male: SUICIDE_MALE, female: SUICIDE_FEMALE, src: 'mhlw-jinko-gaisu-r6' },
    // 令和6年の平均初婚年齢
    firstMarriageAge: { male: { value: 31.1, src: 'mhlw-jinko-gaisu-r6' }, female: { value: 29.8, src: 'mhlw-jinko-gaisu-r6' } },
    // 50歳で結婚したことがない割合（2020年国勢調査 男28.3%・女17.8% をもとに、平成生まれは上がると置いた）
    neverMarriedAt50: { male: { value: 0.3, estimated: true }, female: { value: 0.22, estimated: true } },
    // 結婚して15〜19年の夫婦の子どもの数の分布（%）。第17回出生動向基本調査（2025年）
    childrenDist: { value: { 0: 9.6, 1: 20.4, 2: 48.7, 3: 21.3 }, src: 'ipss-jnfs17' },
    // 平成30年度の大学（学部）進学率（過年度卒を含む）
    univRate: { value: 0.533, src: 'mext-gakko-kihon-h30' },
    // 令和元年の喫煙率（20歳以上・現在習慣的に喫煙している者）
    smokingRate: { male: { value: 0.271, src: 'mhlw-kenko-eiyo-r1' }, female: { value: 0.076, src: 'mhlw-kenko-eiyo-r1' } },
  },
};
