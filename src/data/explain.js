// データの解説の画面のための、推定の値（estimated: true）の読める名前と単位。
// キーはデータの中の場所（listEstimates の path）の頭。新しく推定の値を足したら、ここにも名前を足す（テストで確かめる）。
export const ESTIMATE_LABELS = {
  'EXAM.kanpouYearsTarget': '官報合格までの平均の年数（民間の開示請求のデータで、公式の数ではありません）',
  'ROUTES.exitRateEstimate': '登録した税理士が1年に抜ける割合（亡くなる・廃業）。新しく登録した人の内訳を出すのに使います',
  'ROUTES.gradShareOfExempt': '試験の免除で登録した人のうち、大学院の学位による免除の人の割合',
  'ROUTES.peerQuitShare': '税理士試験を目指した同期のうち、途中で受験をやめる人の割合',
  'ROUTES.shareByEra': '新しく登録した人の道の割合',
  'ROUTES.femaleShareByRoute': '登録した人の女性の割合',
  'ROUTES.examAdultUnivShare': '働きながら税理士試験を目指す人のうち、大学を出ている人の割合',
  'ROUTES.aspireAgeByRoute': '目指し始める年齢の分布',
  'PRE.taxOffice.postsByYears': '税務署で勤めた年数ごとの役職',
  'PRE.taxOffice.earlyRetireShare': '税務署を定年より前に辞めて税理士に登録する人の割合',
  'PRE.cpa.auditFirmYears': '公認会計士が、税の仕事へ移るまで監査法人にいる年数の分布',
  'PRE.cpa.auditFirmSize': '公認会計士が入る監査法人の規模（大手・中堅・小さな法人）の割合',
  'PRE.lawyer.firmYears': '弁護士になってから税理士に登録するまでの年数の分布',
  'LIFE.heisei.e0': '平成生まれの平均寿命（将来推計の長期の値をあてています）',
  'LIFE.heisei.suicideRateByAgeSex': '自殺の死亡率のうち、公表の表に出ない高い年齢の帯',
  'LIFE.heisei.neverMarriedAt50': '50歳で結婚したことがない人の割合（平成生まれ）',
  'MONEY.householdSavingsStart': '生まれたときの家の貯蓄（家の暮らし向きの5段階ごと）',
  'MONEY.taxOfficePay': '税務署の年収の初任・1年あたりの伸び・上限',
  'MONEY.styleFactor': '社員税理士・企業内税理士の年収が勤務の税理士の何倍か',
  'MONEY.spouseIncome': '配偶者の年収（勤め・パート）',
  'MONEY.effort': '頑張り具合ごとの、昇給・使うお金・健康・幸福の変わり方',
  'MONEY.shocks': '出来事で急に減るお金（病気・離婚・顧問先の倒産・災害）',
  'MONEY.school': '受験の話が来やすさ・受かる割合・中高一貫の割合・大学が私立の割合・高校生のアルバイト・商業科に進む割合',
  'MONEY.turning': '就職先ごとの年収の倍率・育休と時短の年収・事務所の譲り受けと譲る代金・家で介護する費用・付き合った人と別れる割合',
  'MONEY.household': '家が貯める割合・親の家で働く人が家に入れる分・大学に行く子の費用・暮らしの借金を返す年数',
};

// 値の書き方（割合は百分率にするので、ここには割合でない値だけ）
export const ESTIMATE_UNITS = {
  'EXAM.kanpouYearsTarget': v => `${v}年`,
  'LIFE.heisei.e0': v => `${v}歳`,
  'LIFE.heisei.suicideRateByAgeSex': v => `人口10万人あたり${v}人`,
};

// 場所の後ろの部分の読み方（男女・道）
export const SEGMENT_LABELS = {
  male: '男性', female: '女性', exam: '税理士試験', 'tax-office': '税務署', cpa: '公認会計士', lawyer: '弁護士',
};
