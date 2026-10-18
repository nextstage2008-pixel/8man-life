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

// 振り返りの問い（節目で一息つく）。書いた文は画面が持ち、計算には入れない
const REFLECT_Q = {
  aspire: ['税理士を目指すと決めた今の気持ちを、書き留めておきますか。', '何がきっかけで、この道を選びましたか。'],
  start: ['はじめての一歩を踏み出しました。いま、何を思っていますか。', '最初の年を終えました。思っていたのと何が違いましたか。'],
  shikaku: ['税理士になる資格がそろいました。ここまでの道のりを、どう振り返りますか。', 'くじけそうになったとき、支えてくれたものは何でしたか。'],
  kaigyo: ['自分の事務所を開きました。どんな事務所にしたいですか。', '最初の顧問先に、何を約束しますか。'],
  retire: ['仕事を終えました。いちばん心に残っている仕事は何ですか。', 'これから税理士を目指す人に、何を伝えたいですか。'],
};

export const REFLECT = {
  id: 'reflect', maxPerLife: 5, when: () => true,
  build: s => ({
    kind: 'reflect',
    title: 'ひと息',
    body: (REFLECT_Q[s._reflect] ?? REFLECT_Q.aspire)[(s.age + (s.seed ?? 0)) % 2],
    input: true,
    choices: [
      { k: 'write', label: '書き留めて、人生を続ける' },
      { k: 'keep', label: '胸にしまって、人生を続ける' },
    ],
  }),
  auto: { write: 30, keep: 70 },
  apply: () => ({ lines: [{ kind: 'reflect', text: '（ひと息ついて、ここまでを振り返りました。）' }] }),
};
