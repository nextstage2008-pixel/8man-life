// 税理士試験の統計。国税庁の各回の結果表（科目別は当年と前年の合格率が載っている）から写した。
// 第66〜68回（2016〜2017年）の結果ページは国税庁のサイトから消えていたので、2018年からにした。

export const EXAM = {
  src: 'nta-exam-r7',
  yearSrc: { 2025: 'nta-exam-r7', 2024: 'nta-exam-r7', 2023: 'nta-exam-r5', 2022: 'nta-exam-r5', 2021: 'nta-exam-r3', 2020: 'nta-exam-r3', 2019: 'nta-exam-r1', 2018: 'nta-exam-r1' },
  subjects: [
    { id: 'boki', name: '簿記論', kind: 'accounting', required: 'boku' },
    { id: 'zaihyo', name: '財務諸表論', kind: 'accounting', required: 'zaihyo' },
    { id: 'shotoku', name: '所得税法', kind: 'tax', required: 'hojin-or-shotoku' },
    { id: 'hojin', name: '法人税法', kind: 'tax', required: 'hojin-or-shotoku' },
    { id: 'sozoku', name: '相続税法', kind: 'tax' },
    { id: 'shohi', name: '消費税法', kind: 'tax', group: 'shohi-or-shuzei' },
    { id: 'shuzei', name: '酒税法', kind: 'tax', group: 'shohi-or-shuzei' },
    { id: 'choshu', name: '国税徴収法', kind: 'tax' },
    { id: 'jumin', name: '住民税', kind: 'tax', group: 'jumin-or-jigyo', local: true },
    { id: 'jigyo', name: '事業税', kind: 'tax', group: 'jumin-or-jigyo', local: true },
    { id: 'kotei', name: '固定資産税', kind: 'tax', local: true },
  ],
  // 科目ごと・年ごとの合格率（合格者数÷受験者数）
  passRateBySubjectYear: {
    boki: { 2018: 0.148, 2019: 0.174, 2020: 0.226, 2021: 0.165, 2022: 0.230, 2023: 0.174, 2024: 0.174, 2025: 0.111 },
    zaihyo: { 2018: 0.134, 2019: 0.189, 2020: 0.190, 2021: 0.239, 2022: 0.148, 2023: 0.281, 2024: 0.080, 2025: 0.319 },
    shotoku: { 2018: 0.123, 2019: 0.128, 2020: 0.120, 2021: 0.126, 2022: 0.141, 2023: 0.138, 2024: 0.126, 2025: 0.130 },
    hojin: { 2018: 0.116, 2019: 0.147, 2020: 0.161, 2021: 0.128, 2022: 0.123, 2023: 0.140, 2024: 0.164, 2025: 0.135 },
    sozoku: { 2018: 0.118, 2019: 0.117, 2020: 0.106, 2021: 0.128, 2022: 0.142, 2023: 0.116, 2024: 0.187, 2025: 0.138 },
    shohi: { 2018: 0.106, 2019: 0.119, 2020: 0.125, 2021: 0.119, 2022: 0.114, 2023: 0.119, 2024: 0.103, 2025: 0.101 },
    shuzei: { 2018: 0.128, 2019: 0.124, 2020: 0.139, 2021: 0.126, 2022: 0.132, 2023: 0.127, 2024: 0.121, 2025: 0.122 },
    choshu: { 2018: 0.107, 2019: 0.127, 2020: 0.122, 2021: 0.137, 2022: 0.138, 2023: 0.139, 2024: 0.130, 2025: 0.138 },
    jumin: { 2018: 0.135, 2019: 0.190, 2020: 0.181, 2021: 0.127, 2022: 0.172, 2023: 0.147, 2024: 0.182, 2025: 0.178 },
    jigyo: { 2018: 0.110, 2019: 0.148, 2020: 0.131, 2021: 0.126, 2022: 0.141, 2023: 0.164, 2024: 0.137, 2025: 0.123 },
    kotei: { 2018: 0.149, 2019: 0.137, 2020: 0.135, 2021: 0.138, 2022: 0.184, 2023: 0.173, 2024: 0.180, 2025: 0.155 },
  },
  // R7（第75回）の年齢別。合格者は5科目到達と一部科目合格の合計。
  passRateByAge: [
    { from: 0, to: 20, rate: 0.354 },
    { from: 21, to: 25, rate: 0.294 },
    { from: 26, to: 30, rate: 0.255 },
    { from: 31, to: 35, rate: 0.248 },
    { from: 36, to: 40, rate: 0.214 },
    { from: 41, to: 120, rate: 0.115 },
  ],
  overallPassRate2025: 0.216,
  // 5科目到達者（官報合格者）。female は内書。
  kanpouBySex: {
    2025: { total: 527, female: 141 },
    2024: { total: 578, female: 148 },
  },
  examineesByYear: { 2025: 36320, 2024: 34757 },
  examineesFemaleByYear: { 2025: 10439, 2024: 9866 },
  // 官報合格までの平均年数。民間の開示請求のデータ（10.37年）で公式ではない。
  kanpouYearsTarget: { value: 10.4, src: 'agora-kanpou', estimated: true },
  // 合格発表の月（試験公告）：第71回（令和3年）までは12月中旬（令和3年12月17日）、第72回（令和4年）からは11月末（令和4年11月30日・令和5年11月30日・令和6年11月29日・令和7年11月28日）
  announceMonth: { until2021: 12, from2022: 11, src: 'nta-exam-kokoku' },
  announceMonthOf(year) { return year <= 2021 ? this.announceMonth.until2021 : this.announceMonth.from2022; },
};

const YEARS = Object.keys(EXAM.passRateBySubjectYear.boki).map(Number);
const FIRST = Math.min(...YEARS);
const LAST = Math.max(...YEARS);

// その年の科目の合格率。範囲の外は端の年の値を使う（2026年以降は2025年の値で止める）。
export function rateFor(subjectId, year) {
  const y = Math.min(LAST, Math.max(FIRST, year));
  return EXAM.passRateBySubjectYear[subjectId][y];
}
