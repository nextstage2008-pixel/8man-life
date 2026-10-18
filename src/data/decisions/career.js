// 税理士になってからの分かれ道。おまかせの重みは推定（働き方の割合が業界の調査の丸めた値に合うように較正）。
import { MONEY } from '../money.js';

export const KAIGYO = {
  id: 'kaigyo', maxPerLife: 3, when: () => true, needs: s => ['shozoku', 'kigyonai'].includes(s.career.workStyle),
  build: () => ({
    title: '独立して事務所を開きますか',
    body: '開業すれば、顧問先は自分で集めることになります。',
    choices: [
      { k: 'go', label: '独立する', sub: '収入は顧問先しだい' },
      { k: 'stay', label: '今の職場で続ける' },
    ],
  }),
  auto: { go: 42, stay: 58 },
  apply: (k) => ({ lines: [{ text: k === 'go' ? '独立して、自分の事務所を開くと決めました。' : '今の職場で続けることにしました。' }], apply: st => { st.career.kaigyoPlan = k === 'go'; if (k === 'go') st.career.kaigyoPlanAt = st.age; } }),
};

export const SHAIN = {
  id: 'shain', when: () => true, needs: s => !s.career.kaigyoPlan,
  build: () => ({
    title: '社員税理士になりますか',
    body: '税理士法人の社員になると、法人の経営にも責任を持ちます。',
    choices: [
      { k: 'yes', label: '社員になる' },
      { k: 'no', label: '今のまま働く' },
    ],
  }),
  auto: { yes: 35, no: 65 },
  apply: (k) => ({ lines: [{ text: k === 'yes' ? '税理士法人の社員税理士になりました。' : '社員の話は断り、今のまま働くことにしました。' }], apply: st => { if (k === 'yes') st.career.workStyle = 'shain'; } }),
};

export const HIRE = {
  id: 'hire', when: () => true,
  build: s => ({
    title: '職員を雇いますか',
    body: `顧問先が${s.career.clients}件になりました。一人で回すのが難しくなってきました。`,
    choices: [
      { k: 'yes', label: '職員を雇う', sub: '顧問先を増やせるが、給料の責任ができる' },
      { k: 'no', label: '一人で続ける', sub: '目の届く数にしぼる' },
    ],
  }),
  auto: { yes: 65, no: 35 },
  apply: (k) => ({ lines: [{ text: k === 'yes' ? '求人を出し、職員を一人雇いました。' : '顧問先の数をしぼり、一人で続けることにしました。' }], apply: st => { if (k === 'yes') st.career.staff += 1; else st.career.capClients = st.career.clients; } }),
};

export const MURI = {
  id: 'muri', roles: ['owner', 'employed', 'partner'], when: (s, ctx) => ctx.rng() < 0.02,
  needs: s => s.career.phase === 'registered' && s.career.workStyle !== 'kigyonai',
  build: () => ({
    title: '顧問先の社長の頼み',
    body: '長い付き合いの社長から、「売上を少し少なく見せられないか」と頼まれました。',
    choices: [
      { k: 'refuse', label: 'きっぱり断る', sub: '顧問先を失うかもしれない' },
      { k: 'accept', label: '黙って応じる' },
    ],
  }),
  auto: { refuse: 97, accept: 3 },
  apply: (k) => (k === 'refuse'
    ? { lines: [{ text: 'できないと伝えました。社長はしばらく黙り、「そうだよな」と笑いました。' }], apply: st => { st.career.reputation += 5; } }
    : { lines: [{ text: '言われたとおりに数字を合わせました。その夜は眠れませんでした。' }], apply: st => { st.career.reputation -= 15; st.flags.add('risky'); } }),
};

export const OWNER_RETIRE = {
  id: 'owner-retire', maxPerLife: 4, when: () => true,
  build: s => ({
    title: '事務所をどうしますか',
    body: `${s.age}歳になりました。顧問先は${s.career.clients}件あります。`,
    choices: [
      { k: 'yuzuru', label: '事務所を譲って引退する', sub: '後を任せる人を探す' },
      { k: 'haigyo', label: '事務所を閉じて引退する', sub: '顧問先には別の事務所を紹介する' },
      { k: 'zokko', label: 'まだ続ける' },
    ],
  }),
  auto: s => ({ yuzuru: s.flags.has('heir') ? 80 : 12, haigyo: 18, zokko: s.age >= 80 ? 20 : 70 }),
  apply: (k) => ({ lines: [], apply: st => { st.career.retirePlan = k; } }),
};

export const EMP_RETIRE = {
  id: 'emp-retire', maxPerLife: 3, when: () => true,
  build: s => ({
    title: '仕事を続けますか',
    body: `${s.age}歳になりました。`,
    choices: [
      { k: 'retire', label: '引退する' },
      { k: 'zokko', label: 'もう少し続ける' },
    ],
  }),
  auto: s => ({ retire: s.age >= 72 ? 60 : 35, zokko: 50 }),
  apply: (k) => ({ lines: [], apply: st => { st.career.retirePlan = k === 'retire' ? 'retire' : 'zokko'; } }),
};

// ── 税理士になってからの道の「いろいろ」（開業しても所属しても、いろいろな人生に） ──
const addPath = (st, p) => { const a = (st.career.paths = st.career.paths ?? []); if (!a.includes(p)) a.push(p); };
export { addPath };

export const TSUGU = {
  id: 'tsugu', when: () => true, needs: s => !s.career.kaigyoPlan && s.career.workStyle === 'shozoku' && s.career.firm === 'kojin',
  build: () => ({
    title: '所長の事務所を継ぎますか',
    body: '所長から、引退するので事務所を継いでほしいと言われました。',
    choices: [
      { k: 'yes', label: '継ぐ', sub: '顧問先と職員を引き受ける' },
      { k: 'no', label: '断る' },
    ],
  }),
  auto: { yes: 45, no: 55 },
  apply: (k) => ({
    lines: [{ text: k === 'yes' ? '所長の事務所を継ぐと決めました。所長は、顧問先の名簿を黙って手渡してくれました。' : '自分にはまだ早いと、継ぐ話を断りました。' }],
    apply: st => { if (k === 'yes') st.career.tsuguPlan = true; },
  }),
};

export const DAIHYO = {
  id: 'daihyo', when: () => true,
  build: () => ({
    title: '代表社員になりますか',
    body: '税理士法人の代表を引き受けてほしいと頼まれました。',
    choices: [
      { k: 'yes', label: '代表を引き受ける', sub: '法人の舵取りを担う' },
      { k: 'no', label: '今の役目のままでいる' },
    ],
  }),
  auto: { yes: 50, no: 50 },
  apply: (k) => ({
    lines: [{ text: k === 'yes' ? '税理士法人の代表社員になりました。' : '代表の話は、ほかの社員税理士に譲りました。' }],
    apply: st => { if (k === 'yes') { st.career.daihyo = true; addPath(st, 'daihyo'); } },
  }),
};

export const TO_KIGYO = {
  id: 'to-kigyo', when: () => true, needs: s => !s.career.kaigyoPlan && !s.career.tsuguPlan,
  build: () => ({
    title: '会社の中の税理士になりますか',
    body: '顧問先の会社から、経理部に来てほしいと誘われました。',
    choices: [
      { k: 'yes', label: '会社に移る', sub: '一つの会社の税を深く見る' },
      { k: 'no', label: '事務所に残る' },
    ],
  }),
  auto: { yes: 35, no: 65 },
  apply: (k) => ({
    lines: [{ text: k === 'yes' ? '事務所を辞め、会社の経理部に入りました。' : '事務所に残ることにしました。' }],
    apply: st => { if (k === 'yes') { st.career.workStyle = 'kigyonai'; st.career.firm = 'kigyo'; st.career.workplaces.push('会社の経理部'); addPath(st, 'to-kigyo'); } },
  }),
};

export const HOJINKA = {
  id: 'hojinka', when: () => true,
  build: s => ({
    title: '税理士法人にしますか',
    body: `顧問先が${s.career.clients}件になりました。事務所を法人にする話が出ています。`,
    choices: [
      { k: 'yes', label: '税理士法人にする', sub: '仲間の税理士と組む' },
      { k: 'no', label: '個人の事務所のまま続ける' },
    ],
  }),
  auto: { yes: 25, no: 75 },
  apply: (k) => ({
    lines: [{ text: k === 'yes' ? '事務所を税理士法人にしました。看板の名前が変わりました。' : '個人の事務所のまま続けることにしました。' }],
    apply: st => { if (k === 'yes') { st.career.workStyle = 'shain'; st.career.daihyo = true; st.career.firm = 'own-hojin'; addPath(st, 'hojinka'); } },
  }),
};

export const YUZURIUKE = {
  id: 'yuzuriuke', when: () => true, needs: s => s.career.workStyle === 'kaigyo',
  build: () => ({
    title: '事務所を譲り受けますか',
    body: '後継ぎのいない先輩の税理士から、事務所を引き継いでほしいと頼まれました。',
    choices: [
      { k: 'yes', label: '譲り受ける', sub: '顧問先が増えるが、責任も増える' },
      { k: 'no', label: '断る' },
    ],
  }),
  auto: { yes: 50, no: 50 },
  // 譲り受けの代金は、引き継ぐ顧問先1件あたりの額（推定）を、事務所の譲り受けの借入金にする
  apply: (k, s, ctx) => {
    if (k !== 'yes') return { lines: [{ text: '今の顧問先で手一杯だと、丁寧に断りました。' }] };
    const gained = 10 + Math.floor(ctx.rng() * 16);
    const price = gained * MONEY.turning.value.yuzuriukePerClient;
    return {
      lines: [{ text: '先輩の事務所を譲り受けました。顧問先に一軒ずつ挨拶に回りました。' }],
      apply: st => { st.career.clients += gained; st.career.staff += 1; addPath(st, 'yuzuriuke'); },
      money: [{ op: 'loan', kind: 'yuzuriuke', amount: price, years: MONEY.kaigyoFund.value.years }],
    };
  },
};

export const MODORU = {
  id: 'modoru', when: () => true,
  build: s => ({
    title: '勤めに戻りますか',
    body: `開業して${s.age - s.career.kaigyoAt}年、顧問先は${s.career.clients}件のままです。`,
    choices: [
      { k: 'modoru', label: '事務所を閉じて、勤めに戻る' },
      { k: 'keep', label: 'もう少し続ける' },
    ],
  }),
  auto: { modoru: 40, keep: 60 },
  apply: (k) => ({
    lines: [{ text: k === 'modoru' ? '事務所を閉じ、税理士法人に勤めることにしました。看板を下ろした日は、雨でした。' : 'もう少しだけ、自分の事務所で踏ん張ることにしました。' }],
    apply: st => {
      if (k !== 'modoru') return;
      const c = st.career;
      c.workStyle = 'shozoku'; c.firm = 'hojin'; c.clients = 0; c.clientsInit = false; c.kaigyoPlan = false; c.staff = 0;
      c.workplaces.push('税理士法人');
      addPath(st, 'modoru');
    },
  }),
};
