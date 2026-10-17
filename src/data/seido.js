// 税理士になる道の制度。値は条文と国税庁・人事院の資料で確かめたもの（2026-10-17）。
// 法令DB（hourei_new.db）に税理士法・公認会計士法・弁護士法・国家公務員法を足して読んだ。

// 国家公務員の定年。令和5年度から2年に1歳ずつ上がり、令和13年度に65歳（令和3年法律第61号）。
// year は年度の始まりの暦年（4月〜翌3月）。
function retirementAge(year) {
  if (year <= 2022) return 60;
  if (year >= 2031) return 65;
  return 61 + Math.floor((year - 2023) / 2);
}

export const SEIDO = {
  // 試験合格者・全科目免除者は、租税または会計の事務に通算2年以上の従事が要る
  jitsumuYears: { value: 2, src: 'zeirishi-ho', article: '税理士法3条1項ただし書' },
  // 弁護士・公認会計士は税理士となる資格を持つ（実務経験は要らない）
  lawyerQualified: { value: true, src: 'zeirishi-ho', article: '税理士法3条1項3号・弁護士法3条2項' },
  cpaQualified: { value: true, src: 'zeirishi-ho', article: '税理士法3条1項4号' },
  // 2017-04-01以後に公認会計士試験に合格した人は、税法に関する研修の修了が要る
  cpaKenshuFrom: { value: '2017-04-01', src: 'nta-toroku', article: '税理士法3条3項' },
  // 公認会計士試験の合格者は会計学に属する科目が免除される
  cpaAccountingExempt: { value: true, src: 'zeirishi-ho', article: '税理士法8条1項3号' },
  // 弁護士は国税局長に通知すれば、登録しなくても税理士業務を行える
  lawyerNotice51: { value: true, src: 'zeirishi-ho', article: '税理士法51条1項' },
  // 税法の科目は3つを選び、所得税法か法人税法のどちらかは必須
  taxSubjectsToPass: { value: 3, src: 'zeirishi-ho', article: '税理士法6条1号' },
  // 国税の賦課の事務10年以上で税法（国税）の科目が免除。それ以外の国税の事務は15年
  obTaxLawYears: { value: 10, src: 'zeirishi-ho', article: '税理士法8条1項4号' },
  obTaxLawYearsOther: { value: 15, src: 'zeirishi-ho', article: '税理士法8条1項5号' },
  // 国税の事務23年以上で、管理・監督の職などに5年以上いて、指定研修を修了すると会計学の科目も免除
  obAccountingYears: { value: 23, src: 'zeirishi-ho', article: '税理士法8条1項10号イ' },
  obShiteiKanshokuYears: { value: 5, src: 'zeirishi-ho', article: '税理士法8条1項10号' },
  // 大学院の学位による一部免除（1科目の合格＋研究の認定で残りの科目を合格とみなす）。2002-04-01以後の進学に適用
  gradSchoolPartialFrom: { value: '2002-04-01', src: 'nta-gakui-menjo', article: '税理士法7条2項・3項' },
  // 令和5年度（第73回）から、会計学の科目は受験資格が不要になった
  examEligibilityRelaxedYear: { value: 2023, src: 'nta-shikaku-minaoshi', article: '税理士法5条' },
  // 管理監督職は原則60歳で降りる（役職定年）
  kanriKantokuAge: { value: 60, src: 'kokkakomuin-ho', article: '国家公務員法81条の2第2項' },
  retirementAgeRule: { value: '令和5年度61歳から2年に1歳ずつ、令和13年度に65歳', src: 'jinji-teinen', article: '国家公務員法81条の6第2項・令和3年法律第61号附則' },
  retirementAge,
};
