// 金額の書き方（万円）。千の位で区切り、1億を超えたら「億」を使う。0以下は「0円」。
export function formatMan(n) {
  const v = Math.round(n ?? 0);
  if (v <= 0) return '0円';
  const oku = Math.floor(v / 10000);
  const rest = v % 10000;
  if (!oku) return `${rest.toLocaleString('ja-JP')}万円`;
  return rest ? `${oku}億${rest.toLocaleString('ja-JP')}万円` : `${oku}億円`;
}
