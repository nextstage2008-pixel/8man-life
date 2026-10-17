// 税理士になる前の段階の統計（税務署・公認会計士・弁護士）。2026-10-17 に一次資料から写した。

export const PRE = {
  taxOffice: {
    src: 'jinji-2025',
    // 入る道。share は2025年度の最終合格者数の比（採用数そのものではない）。
    entry: [
      { kind: 'kokuzei-senmonkan', label: '国税専門官', ageAtEntry: 22, share: 3394, hired2025: 3394, female2025: 1503 },
      { kind: 'zeimu-shokuin', label: '税務職員', ageAtEntry: 18, share: 1329, hired2025: 1329, female2025: 550 },
    ],
    // 国税庁の定員（令和8年度末）
    teiin2026: { value: 56035, src: 'nta-teiin-r8' },
    // 在職年数ごとの役職（一般的な名称・年数は推定）
    postsByYears: {
      estimated: true,
      steps: [
        { years: 0, post: '署員' },
        { years: 8, post: '上席' },
        { years: 16, post: '統括官' },
        { years: 26, post: '副署長' },
        { years: 33, post: '署長' },
      ],
      // その役職まで上がる人の割合（推定）
      reachShare: { 署員: 1, 上席: 0.95, 統括官: 0.7, 副署長: 0.3, 署長: 0.12 },
    },
    // 定年より前に辞めて税理士登録する人の割合（推定）
    earlyRetireShare: { value: 0.3, estimated: true },
  },
  cpa: {
    src: 'fsa-cpa-r7',
    // 最終合格者 ÷ 出願者
    passRateByYear: { 2018: 0.111, 2019: 0.107, 2020: 0.101, 2021: 0.096, 2022: 0.077, 2023: 0.076, 2024: 0.074, 2025: 0.074 },
    // R7 合格者の年齢の構成比（%）
    passAgeDist: [
      { from: 16, to: 19, w: 1.6 },
      { from: 20, to: 24, w: 61.2 },
      { from: 25, to: 29, w: 26.3 },
      { from: 30, to: 34, w: 7.3 },
      { from: 35, to: 39, w: 2.3 },
      { from: 40, to: 44, w: 0.9 },
      { from: 50, to: 54, w: 0.3 },
    ],
    passers2025: 1636,
    // R7 職業別合格者調：働きながらの合格者（税理士3・会計事務所員67・会社員89・公務員23・教員2・教育・学習支援者2）186人 / 1,636人。
    // 学生と専修学校・各種学校受講生が999人、無職（専念）が395人
    workingPasserShare: { value: 0.114, src: 'fsa-cpa-r7' },
    female2025: 392,
    // 監査法人にいる年数（税務へ移るまで・推定）
    auditFirmYears: { estimated: true, dist: [{ from: 3, to: 5, w: 40 }, { from: 6, to: 10, w: 40 }, { from: 11, to: 20, w: 20 }] },
    // 公認会計士となる資格：業務補助等の期間3年以上＋実務補習の修了（公認会計士法3条）。
    // 業務補助等は公認会計士又は監査法人を補助した期間など（同15条1項）。合格者は監査法人で3年を過ごしてから資格を得る
    gyomuHojoYears: { value: 3, src: 'kaikeishi-ho' },
    // 合格して入る監査法人の規模（大手・中堅・小さな法人。推定）
    auditFirmSize: { estimated: true, dist: { big: 75, mid: 15, small: 10 } },
  },
  lawyer: {
    src: 'moj-shiho-r7',
    passRateByYear: { 2024: 0.421, 2025: 0.412 },
    passAgeMean: { value: 26.8, src: 'moj-shiho-r7' },
    femaleShare: { value: 0.303, src: 'moj-shiho-r7' },
    // 合格者のうち初めての受験で合格した割合（R7 1,197/1,581）
    firstTryShare: { value: 0.757, src: 'moj-shiho-r7' },
    // 合格者のうち選択科目で租税法を選んだ割合（R7 58/1,581）
    taxLawElectiveShare: { value: 0.0367, src: 'moj-shiho-r7' },
    shushuYears: 1,
    // 弁護士になってから税理士登録するまでの年数（推定）
    firmYears: { estimated: true, dist: [{ from: 3, to: 10, w: 40 }, { from: 11, to: 20, w: 40 }, { from: 21, to: 30, w: 20 }] },
  },
};
