// mulberry32。種を決めれば同じ列が出るので、人生を丸ごと再現してテストできる。
// 計算では標準の乱数を使わず、必ずこの関数を受け取って使う（純粋性テストで縛る）。
export function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng, min, max) {
  return Math.floor(min + rng() * (max - min + 1));
}

// 年ごと・決断ごとに乱数を作り直すための種。部分を '|' でつなぎ FNV-1a 32bit にする。
export function deriveSeed(...parts) {
  const s = parts.join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// 重みつきのくじ。重み0以下は候補から外す。
export function pickWeighted(rng, weights) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (!(total > 0)) throw new Error('pickWeighted: 正の重みがない');
  let r = rng() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r < 0) return k;
  }
  return entries[entries.length - 1][0];
}

// 正規分布（Box-Muller）
export function normal(rng, mean, sd) {
  const u = 1 - rng();
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
