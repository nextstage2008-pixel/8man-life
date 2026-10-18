// 人生全般の分かれ道。おまかせの重みは推定（たばこは喫煙率をそのまま使う）。

export const MARRY = {
  id: 'marry', maxPerLife: 3, when: () => true,
  build: s => ({
    title: '結婚の話',
    body: `${s._partner}と付き合って、しばらくたちました。`,
    choices: [
      { k: 'yes', label: '結婚する' },
      { k: 'no', label: 'まだ決めない' },
    ],
  }),
  auto: { yes: 88, no: 12 },
  apply: (k) => ({ lines: k === 'no' ? [{ text: 'もう少し考えることにしました。' }] : [] , apply: st => { st._marryAnswer = k; } }),
};

function smokeFrom(s) {
  const c = s.career;
  if (s.flags.has('shushoku') || c.phase === 'tax-office' || c.job === 'jimusho' || c.job === 'keiri') return '職場の先輩';
  if (s.flags.has('will-univ') && s.age < 22) return '大学の先輩';
  if (s.flags.has('boki1') && s.age <= 20) return '専門学校の先輩';
  if (c.job === 'senen') return '受験仲間';
  return '職場の先輩';
}

export const SMOKE = {
  id: 'smoke', ages: [20, 20], when: () => true,
  // 20歳の居場所で、勧める人を変える（大学・専門学校の学生に「職場」と書かない）
  build: s => ({ title: 'たばこ', body: `${smokeFrom(s)}に、たばこを勧められました。`, choices: [{ k: 'no', label: '吸わない' }, { k: 'yes', label: '吸ってみる' }] }),
  auto: (s, ctx) => { const r = ctx.data.LIFE[s.era].smokingRate[s.sex].value; return { yes: r * 100, no: (1 - r) * 100 }; },
  apply: (k) => ({ lines: [{ text: k === 'yes' ? '一本もらって吸いました。それから、吸うようになりました。' : 'たばこは断りました。' }], apply: st => { st.habits.smoke = k === 'yes'; } }),
};

export const DRINK = {
  id: 'drink', ages: [23, 23], when: () => true,
  build: () => ({ title: 'お酒', body: '仕事のあとに飲みに行く日が増えてきました。', choices: [{ k: 'hodo', label: 'ほどほどにする' }, { k: 'yoku', label: 'よく飲む' }] }),
  auto: { hodo: 85, yoku: 15 },
  apply: (k) => ({ lines: [], apply: st => { st.habits.drink = k === 'yoku'; } }),
};

export const EXERCISE = {
  id: 'exercise', ages: [35, 35], when: () => true,
  build: () => ({ title: '運動', body: '階段で息が切れるようになりました。', choices: [{ k: 'start', label: '運動を始める' }, { k: 'no', label: '忙しいので後回し' }] }),
  auto: { start: 40, no: 60 },
  apply: (k) => ({ lines: [{ text: k === 'start' ? '朝、少し早く起きて走るようになりました。' : '運動は、時間ができたら始めることにしました。' }], apply: st => { st.habits.exercise = k === 'start'; } }),
};

// 心の不調。選んだ道が、回復の確率とその後の危うさを変える（本家の解析と同じ考え方・倍率は推定）
export const MENTAL = {
  id: 'mental', maxPerLife: 3, when: () => true,
  build: () => ({
    title: '心がひどく疲れています',
    body: '眠れない日が続いています。',
    choices: [
      { k: 'consult', label: '専門家に相談する', sub: '病院や相談の窓口に行く' },
      { k: 'tell', label: '身近な人に打ち明ける' },
      { k: 'alone', label: '一人で耐える' },
    ],
  }),
  auto: { consult: 30, tell: 45, alone: 25 },
  apply: (k) => ({ lines: [{ text: k === 'consult' ? '病院に行き、話を聞いてもらいました。' : k === 'tell' ? '思い切って、家族に打ち明けました。' : '誰にも言わずに、仕事を続けました。' }], apply: st => { st.mental = { k, since: st.age }; } }),
};

export const MENTAL_AGAIN = {
  id: 'mental-again', when: () => true,
  build: () => ({
    title: '助けを求めてみますか',
    body: '一人で耐えて、2年がたちました。',
    choices: [
      { k: 'consult', label: '専門家に相談する' },
      { k: 'tell', label: '身近な人に打ち明ける' },
      { k: 'alone', label: 'このまま耐える' },
    ],
  }),
  auto: { consult: 40, tell: 40, alone: 20 },
  apply: (k) => ({ lines: [{ text: k === 'alone' ? 'まだ誰にも言えませんでした。' : '少しだけ、話してみることにしました。' }], apply: st => { st.mental = { k, since: st.mental?.since ?? st.age }; } }),
};

