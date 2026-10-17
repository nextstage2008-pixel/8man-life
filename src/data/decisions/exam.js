// 試験組の分かれ道。決まった時期に試験の仕組み（engine/exam.js）が置く。
// おまかせの重みは推定（実際に人が選ぶ割合の公表データはない）。

export const EXAM_JOB = {
  id: 'exam-job', when: () => true,
  build: () => ({
    title: '働きながら目指しますか',
    body: '税理士の登録には、税や会計の実務の経験が2年以上いります。',
    choices: [
      { k: 'jimusho', label: '会計事務所で働く', sub: '実務を積みながら受験' },
      { k: 'keiri', label: '会社の経理で働く', sub: '実務を積みながら受験' },
      { k: 'senen', label: '勉強に専念する', sub: '合格しやすいが、収入は少ない' },
    ],
  }),
  auto: { jimusho: 55, keiri: 25, senen: 20 },
  apply: (k, s) => ({
    lines: [{ text: k === 'senen' ? 'アルバイトをしながら、勉強に専念すると決めました。' : k === 'jimusho' ? '会計事務所で補助者として働き始めました。' : '会社の経理部に入りました。' }],
    apply: st => { st.career.job = k; st.career.fulltime = k === 'senen'; },
  }),
};

export const EXAM_LOAD = {
  id: 'exam-load', remember: true, maxPerLife: 99, when: () => true,
  build: () => ({
    title: '1年に何科目を受けますか',
    body: '税理士試験は科目ごとに合格が残ります。',
    choices: [
      { k: 'one', label: '1科目ずつ', sub: '1科目にしぼって確実に' },
      { k: 'two', label: '2科目', sub: 'いちばん多い受け方' },
      { k: 'three', label: '3科目', sub: '早いが負担も大きい' },
    ],
  }),
  // 受験の力が強い人ほど、多くの科目を受けやすい（推定）
  auto: s => {
    const a = Math.exp(0.5 * (s.aptitude ?? 0));
    return s.career.fulltime || s.age < 23 ? { one: 5 / a, two: 35, three: 60 * a } : { one: 35 / a, two: 55, three: 10 * a };
  },
  apply: () => ({ lines: [] }),
};

// 会計の科目が残っているか（会計学の研究の道を出すかどうか）
const accLeft = s => !['boki', 'zaihyo'].every(id => s.career.passed.has(id));

export const EXAM_GRAD = {
  id: 'exam-grad', maxPerLife: 2, when: () => true,
  build: s => ({
    title: '大学院に進みますか',
    body: '修士の学位を取り、その分野の1科目に合格して国税審議会の認定を受けると、同じ分野の残りの科目が免除されます。税法の研究なら残りの税法の科目、会計学の研究なら残りの会計の科目です。',
    choices: [
      { k: 'go', label: '税法の研究で大学院に進む', sub: '2年かかるが、税法の科目が減る' },
      ...(accLeft(s) ? [{ k: 'go-kaikei', label: '会計学の研究で大学院に進む', sub: '2年かかるが、会計の科目が1つ減る' }] : []),
      { k: 'stay', label: '試験で5科目をそろえる' },
    ],
  }),
  // 会計学の研究で免除を受ける人は税法より少ない（推定）
  auto: s => ({ go: 46, 'go-kaikei': accLeft(s) ? 6 : 0, stay: 48 }),
  apply: (k, s) => {
    if (k === 'stay') return { lines: [{ text: '大学院には行かず、試験で科目をそろえると決めました。' }] };
    const field = k === 'go-kaikei' ? 'kaikei' : 'tax';
    const what = field === 'kaikei' ? '会計学' : '税法';
    return {
      lines: [{ text: s.career.job === 'senen' ? `大学院に進み、${what}の研究を始めました。` : `働きながら夜間の大学院に通い、${what}の研究を始めました。` }],
      apply: st => { st.career.grad = { start: st.age, field, done: false, nintei: false }; st.career.gradSchool = true; },
    };
  },
};

// 2つ目の大学院：1つ目の分野で認定を受けたあと、もう1つの分野でも修士を取り、両方の免除を受ける人もいる（少数・推定）
const otherField = s => (s.career.grad.field === 'tax' ? 'kaikei' : 'tax');
const fieldName = f => (f === 'kaikei' ? '会計学' : '税法');

export const EXAM_GRAD2 = {
  id: 'exam-grad2', when: () => true,
  build: s => {
    const other = fieldName(otherField(s));
    return {
      title: 'もう一度、大学院に進みますか',
      body: `${other}の研究でもう一度修士の学位を取り、認定を受けると、${other === '税法' ? '税法' : '会計'}の残りの科目も免除されます。`,
      choices: [
        { k: 'go', label: `${other}の研究で大学院に進む`, sub: 'さらに2年かかる' },
        { k: 'stay', label: '試験で残りの科目をそろえる' },
      ],
    };
  },
  auto: { go: 30, stay: 70 },
  apply: (k, s) => {
    if (k === 'stay') return { lines: [{ text: '大学院はもう十分だと思い、試験で残りの科目をそろえることにしました。' }] };
    const field = otherField(s);
    return {
      lines: [{ text: `もう一度大学院に入り、今度は${fieldName(field)}の研究を始めました。` }],
      apply: st => { const c = st.career; c.gradHistory = [...(c.gradHistory ?? []), c.grad]; c.grad = { start: st.age, field, done: false, nintei: false }; },
    };
  },
};

// 専念して2年たった人に。仕事に戻れば実務の年数がたまり、また専念に戻ることもある
export const EXAM_BACK = {
  id: 'exam-back', maxPerLife: 3, when: () => true,
  build: () => ({
    title: '仕事に戻りますか',
    body: '勉強に専念して2年がたちました。貯金が少なくなってきました。',
    choices: [
      { k: 'jimusho', label: '会計事務所で働きながら続ける', sub: '実務の年数もたまる' },
      { k: 'keep', label: 'もう少し専念する' },
    ],
  }),
  auto: { jimusho: 55, keep: 45 },
  apply: (k) => ({
    lines: [{ text: k === 'keep' ? 'もう一年、専念すると決めました。' : '会計事務所で働きながら受験を続けることにしました。' }],
    apply: st => { if (k === 'jimusho') { st.career.job = 'jimusho'; st.career.fulltime = false; } else st.career.senenSince = st.age; },
  }),
};
