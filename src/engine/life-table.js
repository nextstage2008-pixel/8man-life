// 平均寿命に合わせて較正する生命表（年齢ごとの1年の死亡率 q[0..110]）。
// 0歳は乳児死亡率、1〜14歳は小さな定数、15歳以上はゴンペルツ・メイカム型 A + B·e^(g·x)。
// B を二分探索で決め、平均寿命が e0 に合うようにする（本家の解析と同じ考え方）。
const G = { male: 0.098, female: 0.112 };
const A = { male: 0.00045, female: 0.00018 };
const CHILD = { 1: 0.0002, 5: 0.0001 }; // 1〜4歳・5〜14歳

function table(B, infant, sex) {
  const q = new Array(111);
  q[0] = infant;
  for (let x = 1; x < 15; x++) q[x] = x < 5 ? CHILD[1] : CHILD[5];
  for (let x = 15; x < 110; x++) q[x] = Math.min(1, A[sex] + B * Math.exp(G[sex] * x));
  q[110] = 1;
  return q;
}

// 生存の確率を足し上げ、その年の途中で亡くなる人は半年分を数える。
export function lifeExpectancy(q) {
  let l = 1, e = 0;
  for (let x = 0; x < q.length; x++) {
    e += l * (1 - q[x] / 2);
    l *= 1 - q[x];
  }
  return e;
}

export function buildLifeTable({ e0, infant, sex }) {
  let lo = Math.log(1e-12), hi = Math.log(1e-1);
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    // B が大きいほど寿命は短い
    if (lifeExpectancy(table(Math.exp(mid), infant, sex)) > e0) lo = mid; else hi = mid;
  }
  return table(Math.exp((lo + hi) / 2), infant, sex);
}
