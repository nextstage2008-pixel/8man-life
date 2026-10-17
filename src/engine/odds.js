// 統計の基準の確率 p を、個人の倍率（オッズ比）or で動かす。
export function odds(p, or) {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return (p * or) / (1 - p + p * or);
}

export function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}
