// 税務署・公認会計士・弁護士の道の分かれ道。決まった時期に仕組み（engine/routes-pre.js）が置く。
// おまかせの重みは推定。

export const TO_EARLY = {
  id: 'to-early', when: () => true,
  build: () => ({
    title: '定年より前に辞めますか',
    body: '税理士試験の免除の要件はそろっています。',
    choices: [
      { k: 'early', label: '今年で辞めて税理士になる', sub: '早く独立できる' },
      { k: 'teinen', label: '定年まで勤める' },
    ],
  }),
  auto: { early: 30, teinen: 70 },
  apply: (k) => ({ lines: [{ text: k === 'early' ? '今年度いっぱいで辞めると決めました。' : '定年まで勤めると決めました。' }], apply: st => { st.career.retireEarly = k === 'early'; } }),
};

export const CPA_MOVE = {
  id: 'cpa-move', when: () => true,
  build: () => ({
    title: '監査法人を出ますか',
    body: '公認会計士は、税理士として登録して税の仕事をすることもできます。',
    choices: [
      { k: 'hojin', label: '税理士法人に移る' },
      { k: 'kaigyo', label: '独立して事務所を開く' },
      { k: 'stay', label: 'もう少し監査を続ける' },
    ],
  }),
  auto: { hojin: 45, kaigyo: 35, stay: 20 },
  apply: (k) => ({ lines: [{ text: k === 'stay' ? 'もう少し監査法人に残ることにしました。' : k === 'hojin' ? '税理士法人に移ると決めました。' : '独立して自分の事務所を開くと決めました。' }], apply: st => { st.career.cpaMove = k; } }),
};

export const LAWYER_TAX = {
  id: 'lawyer-tax', maxPerLife: 3, when: () => true,
  build: () => ({
    title: '税理士として登録しますか',
    body: '弁護士は、国税局長に通知すれば、税理士として登録しなくても税の仕事を受けられます。',
    choices: [
      { k: 'register', label: '税理士として登録する' },
      { k: 'notice', label: '通知だけで税の仕事を受ける' },
    ],
  }),
  auto: { register: 60, notice: 40 },
  apply: (k) => ({ lines: [], apply: st => { st.career.lawyerTax = k; st.career.lawyerTaxAskAge = st.age; } }),
};
