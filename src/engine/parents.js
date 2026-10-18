// 親の職業と世帯年収（2026-10-18）。父と母の職業を統計から引き、年収は職業・男女・年齢・働き方の平均。
// 世帯年収＝父＋母。5段階の暮らし向きは世帯年収から決める。母は、末の子が大きくなると働き始めることがある（一行で知らせる）。
// 無職の父は数年のうちに仕事に就き、父を亡くして母が専業主婦なら母が働き始める（世帯年収0円を続けない）。
// 金額は万円。乱数は呼ぶ側の rng を使う。
import { pickWeighted } from './rng.js';

const P = data => data.PARENTS;
const leafWeights = (codes, counts) => Object.fromEntries(codes.map(c => [c, Math.max(0, counts[c] ?? 0)]));
const sum = o => Object.values(o).reduce((a, b) => a + b, 0);

// 平成12年度の大分類の中を、今の分類の人数で割り振る
function pickLeaf(rng, data, group, counts) {
  const codes = P(data).oldToNew.value[group];
  if (codes.length === 1) return codes[0];
  const w = leafWeights(codes, counts);
  return pickWeighted(rng, sum(w) > 0 ? w : leafWeights(codes, P(data).menCount.value));
}

// 母の働き方：出産のときの割合×その大分類で、その働き方をしている女性の多さ（自営の教員のような、統計にない組み合わせは出ない）
function pickMotherStatus(rng, data, group) {
  const X = P(data);
  const codes = X.oldToNew.value[group];
  const w = {};
  for (const [st, share] of Object.entries(X.motherStatusAtBirth.value)) {
    const counts = X.womenCount.value[st];
    w[st] = share * (sum(leafWeights(codes, counts)) / sum(counts));
  }
  return pickWeighted(rng, sum(w) > 0 ? w : { seiki: 1 });
}

// 父が仕事に就く（大分類を出生の統計から、無職を除いて引く）
function fatherJob(rng, data) {
  const X = P(data);
  const { none, ...rest } = X.fatherOcc2000.value;
  return { code: pickLeaf(rng, data, pickWeighted(rng, rest), X.menCount.value) };
}

// 母が働き始める（働き方は「あとから働き始める母」の割合、職業はその働き方の女性の人数で）
function motherStart(rng, data) {
  const X = P(data);
  const status = pickWeighted(rng, X.motherStatusLater.value);
  const counts = X.womenCount.value[status];
  return { code: pickWeighted(rng, leafWeights(Object.keys(counts), counts)), status };
}

// 生まれたとき：父と母の職業（母は働き方も）を決め、世帯年収から5段階の暮らし向きを決める
export function initParents(s, rng, data) {
  const X = P(data);
  const f = s.parents.find(p => p.role === 'father');
  const m = s.parents.find(p => p.role === 'mother');
  const fg = pickWeighted(rng, X.fatherOcc2000.value);
  f.job = { code: fg === 'none' ? 'none' : pickLeaf(rng, data, fg, X.menCount.value) };
  const mg = pickWeighted(rng, X.motherOcc2000.value);
  if (mg === 'none') m.job = { code: 'none' };
  else {
    const status = pickMotherStatus(rng, data, mg);
    m.job = { code: pickLeaf(rng, data, mg, X.womenCount.value[status]), status };
  }
  s.parentsWork = { lastGroup: 0 };
  s.tier = tierOf(householdIncome(s, data), data);
}

// 年齢の区切り（5歳ごと）の何番目か
function binOf(ages, age) {
  let i = 0;
  for (let k = 0; k < ages.length; k++) if (age >= ages[k]) i = k;
  return i;
}
// 人数が少なくて値のない区切りは、同じ職業のいちばん近い年齢の値を、全体の年齢の伸びで直して使う（全体の値に跳ばない）
function valueAt(table, code, i) {
  const row = table[code], all = table['00'];
  if (!row) return all[i];
  if (row[i] != null) return row[i];
  for (let d = 1; d < row.length; d++) {
    for (const j of [i - d, i + d]) if (row[j] != null) return row[j] * (all[i] / all[j]);
  }
  return all[i];
}

// その親の、いまの年収。亡くなっていれば0。70歳を過ぎたら0（推定：引退）
export function parentIncome(s, p, data) {
  if (!p || p.alive === false || !p.job || p.job.code === 'none') return 0;
  const X = P(data);
  const age = p.age + s.age;
  if (age >= 70) return 0;
  if (p.role === 'father') return Math.round(valueAt(X.menIncome.value, p.job.code, binOf(X.menAges.value, age)));
  const i = binOf(X.womenAges.value, age);
  const base = p.job.status === 'jiei' ? X.womenJieiIncome.value[i] : valueAt(X.womenIncome.value[p.job.status === 'hiseiki' ? 'hiseiki' : 'seiki'], p.job.code, i);
  // 女性の表は55〜59歳まで。60歳からは、男性の全体の値の55〜59歳からの下がり方を当てる（推定）
  if (age < 60) return Math.round(base);
  const men = X.menIncome.value['00'], mi = binOf(X.menAges.value, age), m55 = X.menAges.value.indexOf(55);
  return Math.round(base * (men[mi] / men[m55]));
}

export function householdIncome(s, data) {
  return s.parents.reduce((a, p) => a + parentIncome(s, p, data), 0);
}

// 世帯年収 → 5段階
export function tierOf(income, data) {
  return 1 + P(data).tierBounds.value.filter(b => income >= b).length;
}

// 画面に出す職業の言葉。母はパートと自営だけ働き方を添える
export function jobLabel(p, data) {
  const code = p.job?.code ?? 'none';
  if (code === 'none') return p.role === 'mother' ? '専業主婦' : '無職';
  const label = data.PARENTS_JOB_LABEL[code];
  if (p.role !== 'mother') return label;
  if (p.job.status === 'hiseiki') return `パート（${label}）`;
  if (p.job.status === 'jiei') return `自営・家業（${label}）`;
  return label;
}

// 末の子（本人ときょうだいのうち、生まれている子でいちばん下）の年齢の区切り：0〜2・3〜5・6〜8・9〜11・12〜14・15〜17・18歳以上
function youngestGroup(s) {
  const ages = [s.age, ...s.siblings.filter(b => b.alive !== false).map(b => s.age + s.birthYear - b.birthYear).filter(a => a >= 0)];
  const y = Math.min(...ages);
  return y >= 18 ? 6 : Math.floor(y / 3);
}

const startLine = (m, data) => (m.job.status === 'jiei' ? `母が、自営の仕事を始めました（${data.PARENTS_JOB_LABEL[m.job.code]}）。` : `母が、パートで働き始めました（${data.PARENTS_JOB_LABEL[m.job.code]}）。`);

// 年の終わり：①無職の父が仕事に就くことがある ②父を亡くして母が専業主婦なら母が働き始める
// ③末の子の区切りが、これまでの区切りを越えたら、働いていない母が働き始めることがある（母が働く割合が、その区切りの統計の値になるように）。
// 下の子が生まれても区切りは戻さない（もう働いている母は辞めないので、戻すと働く母が多くなりすぎる）。最後に、その年の世帯年収を家のお金に入れる
export const PARENTS_SYSTEM = {
  id: 'parents',
  end(s, ctx) {
    const { data, rng } = ctx;
    const X = P(data);
    const out = [];
    const say = text => { if (s.age < 22) out.push({ kind: 'ev', text }); };
    const st = (s.parentsWork = s.parentsWork ?? { lastGroup: 0 });
    const f = s.parents.find(p => p.role === 'father');
    const m = s.parents.find(p => p.role === 'mother');
    const g = youngestGroup(s);
    if (f && f.alive !== false && f.job?.code === 'none' && f.age + s.age < 60 && rng() < X.fatherFindJob.value) {
      f.job = fatherJob(rng, data);
      say(`父が、仕事に就きました（${data.PARENTS_JOB_LABEL[f.job.code]}）。`);
    }
    if (m && m.alive !== false && m.job?.code === 'none' && f && f.alive === false && g <= 5 && m.age + s.age < 60) {
      m.job = motherStart(rng, data);
      say(startLine(m, data));
    }
    if (g > st.lastGroup && g <= 5) {
      const W = X.motherWorkShare.value;
      // 0〜2歳の区切りからは、出産のときに母が働いている割合（平成12年度の出生の統計）から数える
      const M = X.motherOcc2000.value;
      const atBirth = 1 - M.none / sum(M);
      const from = st.lastGroup === 0 ? atBirth : W[st.lastGroup], to = W[g];
      const pStart = to > from ? (to - from) / (1 - from) : 0;
      // 区切りを越えた年は、母が働いているかどうかに関係なく1回引く（働き始めるときは、働き方と職業にもう2回引く）
      const u = rng();
      if (m && m.alive !== false && m.job?.code === 'none' && u < pStart) {
        m.job = motherStart(rng, data);
        say(startLine(m, data));
      }
      st.lastGroup = g;
    }
    if (s.money?.house) s.money.house.income = householdIncome(s, data);
    return out;
  },
};
