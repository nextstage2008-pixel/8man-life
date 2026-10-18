// 学校のころの転機（お金と転機の設計書6）。決まった年齢に engine/school.js が置く（出やすさのくじではない）。
// 小学校・中学校の受験は、都会の県ほど話が来る（先生の指摘）。幼い本人ではなく家の選択として書く。
// 選択肢の下の説明に、おおよその金額を書く（data/money.js）。道（大学に行くか）と食い違う選択肢は出さない。
import { MONEY } from '../money.js';

const E = MONEY.education.value;
const SC = MONEY.school.value;
const choice = (k, label, sub) => (sub ? { k, label, sub } : { k, label });
const bump = (st, k, n) => { st.stats[k] = Math.max(0, Math.min(100, st.stats[k] + n)); };
const man = n => `${Math.round(n).toLocaleString('ja-JP')}万円`;

export const OJUKEN = {
  id: 'ojuken', ages: [5, 5],
  build: () => ({ title: '小学校の受験', body: '親に、私立の小学校を受けてみないかと言われました。', choices: [
    choice('juken', '受けてみる', `学費は年に${man(E.shoPrivate)}ほど（家の貯蓄から）`),
    choice('no', '近くの公立の小学校に行く'),
  ] }),
  auto: { juken: 50, no: 50 },
  apply: (k, s, ctx) => {
    if (k === 'no') return { lines: [{ text: '近くの公立の小学校に通うことにしました。' }] };
    const pass = ctx.rng() < SC.ojukenPass;
    return { lines: [{ text: pass ? '小学校の受験をして、私立の小学校に合格しました。' : '小学校の受験をしましたが、届きませんでした。近くの小学校に通うことにしました。' }], apply: st => { if (pass) st.school.sho = 'private'; } };
  },
};

export const CHUJUKEN = {
  id: 'chujuken', ages: [11, 11],
  build: () => ({ title: '中学校の受験', body: '中学受験をするかどうか、家族で話し合いました。', choices: [
    choice('juken', '受験する', `塾の費用に加え、私立の中学校は学費が年に${man(E.chuPrivate)}ほど`),
    choice('no', '地元の公立の中学校に行く'),
  ] }),
  auto: { juken: 50, no: 50 },
  apply: (k, s, ctx) => {
    if (k === 'no') return { lines: [{ text: '地元の公立の中学校に進むことにしました。' }] };
    const pass = ctx.rng() < SC.chujukenPass;
    const ikkan = pass && ctx.rng() < SC.ikkan;
    const text = !pass ? '塾に通って中学受験をしましたが、第一志望には届きませんでした。地元の中学校に進みました。'
      : ikkan ? '塾に通って中学受験をし、中高一貫の私立に合格しました。' : '塾に通って中学受験をし、私立の中学校に合格しました。';
    return { lines: [{ text }], apply: st => {
      st.school.juku = true;
      if (pass) { st.school.chu = 'private'; if (ikkan) { st.school.ikkan = true; st.school.ko = 'private'; } }
    } };
  },
};

export const BUKATSU = {
  id: 'bukatsu-hairu', ages: [12, 13],
  build: () => ({ title: '部活に入りますか', body: '中学校に入り、部活の見学が始まりました。', choices: [
    choice('undo', '運動部に入る', '体力はつくが、勉強の時間は減る'),
    choice('bunka', '文化部に入る'),
    choice('none', '入らない'),
  ] }),
  auto: { undo: 60, bunka: 25, none: 15 },
  apply: k => ({ lines: [{ text: k === 'undo' ? '運動部に入りました。朝練の日は、目覚ましを二つかけました。' : k === 'bunka' ? '文化部に入りました。放課後の部室が、居場所になりました。' : '部活には入らず、放課後はまっすぐ家に帰りました。' }],
    apply: st => { st.school.bukatsu = k !== 'none'; if (k === 'undo') { bump(st, 'hl', 3); bump(st, 'so', 2); } else if (k === 'bunka') bump(st, 'so', 2); } }),
};

export const KOKO = {
  id: 'koko', ages: [14, 15], needs: s => !s.school.ikkan,
  build: () => ({ title: '高校の選び方', body: '進む高校を決める時期になりました。', choices: [
    choice('futsu', '公立の普通科'),
    choice('shiritsu', '私立の高校', `学費は年に${man(E.koPrivate)}ほど（家の貯蓄から）`),
    choice('shogyo', '商業科', '簿記を学べる'),
  ] }),
  // おまかせ：私立はその県の私立・国立の高校に通う割合、商業科は推定。高校を出て働く人は商業科に進みやすい（推定）
  auto: s => {
    const share = MONEY.privateSchoolShare.value['高'][s.pref] ?? 0.3;
    const shogyo = SC.shogyo * (s.flags.has('will-univ') ? 0.6 : 3);
    return { futsu: (1 - share - shogyo) * 100, shiritsu: share * 100, shogyo: shogyo * 100 };
  },
  apply: k => ({ lines: [{ text: k === 'futsu' ? '公立の普通科の高校に進みました。' : k === 'shiritsu' ? '私立の高校に進みました。' : '商業科の高校に進み、簿記の授業が始まりました。' }],
    apply: st => { st.school.ko = k === 'shiritsu' ? 'private' : 'public'; if (k === 'shogyo') { st.school.shogyo = true; bump(st, 'sm', 3); } } }),
};

// 大学に行く人は大学（19〜20歳）で、ほかの人は高校（16〜17歳）で1回
export const BAITO = {
  id: 'baito', ages: [16, 20],
  build: s => {
    const univ = s.age >= 18;
    return { title: univ ? '大学のアルバイト' : '高校のアルバイト', body: univ ? '大学の授業に慣れ、時間に少し余裕ができました。' : 'まわりの友だちが、アルバイトを始めています。', choices: [
      choice('none', univ ? 'しない（勉強に集中する）' : 'しない（勉強と部活に集中する）'),
      choice('konbini', 'コンビニや飲食店で働く', `年に${man(univ ? MONEY.wage.value.partTime : SC.partTimeKo)}ほど（自分の貯蓄に）`),
      ...(univ ? [choice('juku', '塾の講師をする'), choice('kaikei', '会計事務所で働く', '税理士の仕事を近くで見られる')] : []),
    ] };
  },
  // おまかせ：大学生（昼間部）の83.8%がアルバイトをしている（学生生活調査）。高校生は推定
  auto: s => (s.age >= 18 ? { none: 16, konbini: 54, juku: 25, kaikei: 5 } : { none: (1 - SC.baitoKo) * 100, konbini: SC.baitoKo * 100 }),
  apply: k => ({ lines: [{ text: k === 'none' ? 'アルバイトはせず、勉強の時間にあてることにしました。' : k === 'konbini' ? 'アルバイトを始めました。最初の給料で、家族にお菓子を買って帰りました。' : k === 'juku' ? '塾の講師のアルバイトを始めました。教えるほうが、よく分かるようになりました。' : '会計事務所でアルバイトを始めました。決算の時期の忙しさを、初めて知りました。' }],
    apply: st => { st.school.baito = k === 'none' ? null : k; if (k === 'kaikei') st.flags.add('baito-kaikei'); } }),
};

export const SHOGAKUKIN = {
  id: 'shogakukin', ages: [18, 18], needs: s => s.flags.has('will-univ'),
  build: () => ({ title: '奨学金を借りますか', body: '大学に進むことが決まりました。学費と暮らしのお金を考えます。', choices: [
    choice('kariru', '奨学金を借りる', `年に${man(MONEY.scholarship.value.perYear)}ほど。卒業してから${MONEY.scholarship.value.repayYears}年で返す`),
    choice('karinai', '借りない', '家に出してもらう'),
  ] }),
  // おまかせ：大学（昼間部）で奨学金を受けている割合55.0%（学生生活調査）。家の暮らし向きで変わる（推定）
  auto: s => { const k = MONEY.scholarship.value.share * [1.4, 1.2, 1, 0.8, 0.6][(s.tier ?? 3) - 1]; return { kariru: k * 100, karinai: (1 - k) * 100 }; },
  apply: k => ({ lines: [{ text: k === 'kariru' ? '奨学金を借りることにしました。返すのは、働き始めてからです。' : '奨学金は借りず、家に学費を出してもらうことにしました。' }], apply: st => { st.school.shogakukin = k === 'kariru'; } }),
};

export const SCHOOL_DECISIONS = [OJUKEN, CHUJUKEN, BUKATSU, KOKO, BAITO, SHOGAKUKIN];
