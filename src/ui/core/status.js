// 人生の画面の上の欄に出す「今の立場」と「合格した科目」。年ごとの記録（trace の1件）から作る。
const ROLE = {
  aspirant: '受験生', examinee: '受験生', passed: '登録の準備中', 'tax-office': '税務署の職員', 'cpa-exam': '会計士試験の受験生',
  cpa: '監査法人の会計士', 'law-exam': '司法試験の受験生', lawyer: '弁護士', retired: '引退',
};
const STYLE = { kaigyo: '開業の税理士', shozoku: '勤務の税理士', shain: '社員税理士', kigyonai: '企業内税理士' };

export function statusOf(entry, route, data) {
  const c = entry?.career ?? {};
  const age = entry?.age ?? 0;
  const roleLabel = c.phase === 'registered' ? (STYLE[c.workStyle] ?? '税理士') : (ROLE[c.phase] ?? (age < 6 ? '子ども' : age <= 22 ? '学生' : '社会人'));
  const subjects = [];
  if (route === 'exam') {
    for (const id of c.passed ?? []) subjects.push({ name: data.EXAM.subjects.find(x => x.id === id)?.name ?? id, state: 'pass' });
    if (c.exemptAcc) subjects.push({ name: '残りの会計', state: 'exempt' });
    if (c.exemptTax) subjects.push({ name: '残りの税法', state: 'exempt' });
  }
  return { roleLabel, subjects };
}
