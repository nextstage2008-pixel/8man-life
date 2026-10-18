// 働き始めてからと家族の転機（お金と転機の設計書6）。決まった時に engine/turning.js（恋愛と結婚は engine/family.js）が置く。
// お金の動きは apply が返す money（ops）で表す（engine/money.js の applyMoneyOps が動かす）。金額は data/money.js。
import { MONEY } from '../money.js';

const T = MONEY.turning.value;
const choice = (k, label, sub) => (sub ? { k, label, sub } : { k, label });
const bump = (st, k, n) => { st.stats[k] = Math.max(0, Math.min(100, st.stats[k] + n)); };
const man = n => `${Math.round(n).toLocaleString('ja-JP')}万円`;

// 学校を出る年の就職活動（志す前に会社で働く人だけ。税務署・会計士・弁護士の道には聞かない）
export const SHUSHOKU = {
  id: 'shushoku', needs: s => s.career.phase === 'pre' && s.aspireAge > s.age && s.route === 'exam',
  build: s => ({ title: '就職活動', body: s.flags.has('will-univ') ? '大学の最後の年、就職活動が始まりました。' : '高校を出たら働くことに決め、就職先を探しました。', choices: [
    choice('ookii', '大きな会社に入る', '給料は高めだが、転勤がある'),
    choice('chusho', '地元の会社に入る', '給料は少し低いが、家の近くで働ける'),
    choice('kanko', '役所や公的な団体に入る'),
  ] }),
  auto: { ookii: 30, chusho: 55, kanko: 15 },
  apply: k => ({ lines: [{ text: k === 'ookii' ? '大きな会社から内定をもらいました。' : k === 'chusho' ? '地元の会社に入ることが決まりました。' : '公的な団体に入ることが決まりました。' }], apply: st => { st.career.companyKind = k; }, money: [{ op: 'company', factor: T.company[k] }] }),
};

// 頑張り具合（就職・登録・45歳の節目に聞く）
export const GANBARI = {
  id: 'ganbari', maxPerLife: 3,
  build: s => ({ title: 'これからの働き方', body: { work: '働き始めて、仕事にも慣れてきました。', register: '税理士として登録しました。これからの働き方を考えます。', 45: '四十五歳になりました。仕事と暮らしの釣り合いを考えます。' }[s._ganbari] ?? 'これからの働き方を考えます。', choices: [
    choice('zenryoku', '仕事に全力を注ぐ', '年収は伸びやすいが、体は疲れやすい'),
    choice('hodohodo', 'ほどほどに働く'),
    choice('kazoku', '家族や趣味を大事にする', '年収の伸びはゆるやかで、使うお金は少し増える'),
  ] }),
  auto: { zenryoku: 30, hodohodo: 50, kazoku: 20 },
  apply: (k, s) => {
    const E = MONEY.effort.value[k];
    const again = s.money.effort === k;
    const text = again ? 'これまでの働き方を続けることにしました。' : { zenryoku: '仕事に全力を注ぐと決めました。', hodohodo: '無理をせず、ほどほどに働くことにしました。', kazoku: '仕事のほかの時間も大事にすることにしました。' }[k];
    return { lines: [{ text }], apply: st => { bump(st, 'hl', E.hl); bump(st, 'h', E.h); }, money: [{ op: 'effort', k }] };
  },
};

// 恋愛：結婚の起こりやすさで来る出会い。付き合うと、1〜2年のうちに結婚の話（family.js）
export const RENAI = {
  id: 'renai', maxPerLife: 6,
  build: s => ({ title: '出会い', body: `${s._partner}と知り合い、何度か食事に行きました。`, choices: [choice('yes', '付き合う'), choice('no', '今はいい')] }),
  auto: { yes: 80, no: 20 },
  apply: k => ({ lines: [{ text: k === 'yes' ? '付き合い始めました。' : '今は仕事と自分のことを大事にしたいと思いました。' }] }),
};

// 子どもを持つか・何人か（結婚の翌年。おまかせは出生動向基本調査の完結出生児数の分布）
export const KODOMO = {
  id: 'kodomo', maxPerLife: 2,
  build: s => ({ title: '子どものこと', body: `${s.spouse?.name ?? '相手'}と、子どものことを話し合いました。`, choices: [
    choice('0', '子どもは持たない'), choice('1', '一人ほしい'), choice('2', '二人ほしい'), choice('3', '三人以上ほしい', '子の分だけ暮らしの費用が増える'),
  ] }),
  auto: (s, ctx) => ({ ...ctx.data.LIFE[s.era].childrenDist.value }),
  apply: k => ({ lines: [{ text: k === '0' ? '二人で暮らしていくことにしました。' : '子どもがほしいと、二人で話しました。' }], apply: st => { st.childTarget = Number(k); } }),
};

// 子育てとの両立（子が生まれた翌年。働いているか受験中の人）。
// 開業・社員税理士・弁護士は雇われていないので、育休（育児休業給付）は出さず「仕事を減らす」にする
const selfEmployed = s => s.career.phase === 'lawyer' || (s.career.phase === 'registered' && (['kaigyo', 'shain'].includes(s.career.workStyle) || s.route === 'lawyer'));
export const RYORITSU = {
  id: 'ryoritsu', maxPerLife: 2,
  build: s => {
    const exam = s.career.phase === 'examinee';
    const self = !exam && selfEmployed(s);
    return { title: exam ? '受験と子育て' : '仕事と子育て', body: `${s._child}が生まれ、毎日があわただしくなりました。`, choices: [
      ...(self ? [] : [choice('ikukyu', exam ? '受験を一年休み、子育てを優先する' : '育休を取る', exam ? '合格は遠のくが、子との時間が取れる' : `その年の年収は${Math.round(T.ikukyu * 100)}%ほど（育児休業給付）`)]),
      choice('jitan', exam ? '勉強の時間を減らして続ける' : self ? '仕事を減らす' : '時短で働く', exam ? undefined : `${T.jitanYears}年ほど、年収が${Math.round(T.jitan * 100)}%ほどに`),
      choice('sonomama', 'これまでどおり', '体は疲れやすい'),
    ] };
  },
  auto: s => (s.career.phase !== 'examinee' && selfEmployed(s) ? { jitan: 50, sonomama: 50 } : { ikukyu: 35, jitan: 35, sonomama: 30 }),
  apply: (k, s) => {
    const exam = s.career.phase === 'examinee';
    const self = !exam && selfEmployed(s);
    const text = k === 'ikukyu' ? (exam ? '受験を一年休み、子育てを優先しました。' : '育休を取りました。子の寝顔を見ながら、昼の時間が過ぎていきました。') : k === 'jitan' ? (exam ? '勉強の時間を減らし、子が寝てから机に向かいました。' : self ? '仕事を減らし、夕方は子と過ごすことにしました。' : '時短で働くことにしました。夕方、保育園に迎えに行く毎日です。') : 'これまでどおりの毎日を続けました。';
    const money = exam ? [] : k === 'ikukyu' ? [{ op: 'incomeFactor', factor: T.ikukyu, years: 1 }] : k === 'jitan' ? [{ op: 'incomeFactor', factor: T.jitan, years: T.jitanYears }] : [];
    return { lines: [{ text }], apply: st => { if (exam && k === 'ikukyu') st.flags.add('rest-year'); if (k === 'sonomama') bump(st, 'hl', -2); else bump(st, 'h', 2); }, money };
  },
};

// 開業資金（独立を決めた翌年の初め・開業の前。新規開業の調査の開業費用の分布から）。答えで開業の文と顧問先が変わる（engine/career.js）
export const KAIGYO_SHIKIN = {
  id: 'kaigyo-shikin',
  build: () => ({ title: '開業資金', body: '事務所を始めるお金をどうするか、決めなければなりません。', choices: [
    choice('none', '借りずに、自分の貯蓄で小さく始める', '部屋は自宅の一室から'),
    choice('small', '少し借りる', `${man(MONEY.kaigyoFund.value.small)}ほど。${MONEY.kaigyoFund.value.years}年で返す`),
    choice('large', '多めに借りて、職員も雇う', `${man(MONEY.kaigyoFund.value.large)}ほど。顧問先を増やしやすい`),
  ] }),
  auto: { none: 40, small: 40, large: 20 },
  apply: k => {
    const F = MONEY.kaigyoFund.value;
    const text = k === 'none' ? '借金はせず、自宅の一室から始めることにしました。' : k === 'small' ? `銀行から${man(F.small)}を借り、机と書棚をそろえました。` : `銀行から${man(F.large)}を借り、駅の近くに部屋を借りて職員を一人雇いました。`;
    // 借りないときは、自分の貯蓄の範囲で始める（暮らしの借金にはしない）
    const money = k === 'none' ? [{ op: 'spendUpTo', amount: 100 }] : [{ op: 'loan', kind: 'kaigyo', amount: k === 'small' ? F.small : F.large, years: F.years }];
    return { lines: [{ text }], apply: st => { st.career.kaigyoFund = k; if (k === 'large') st.career.staff += 1; }, money };
  },
};
