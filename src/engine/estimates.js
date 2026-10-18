// データをたどって、推定の値（estimated: true）を集める。推定の値の一覧と、データの解説に使う。
export function listEstimates(node, path = '', out = []) {
  if (node === null || typeof node !== 'object') return out;
  if (node.estimated === true) {
    const item = { path, value: 'value' in node ? node.value : (node.per100k ?? node.dist ?? node.steps ?? null) };
    if (node.note) item.note = node.note;
    out.push(item);
  }
  for (const [k, v] of Object.entries(node)) {
    if (v && typeof v === 'object') listEstimates(v, path ? `${path}.${k}` : k, out);
  }
  return out;
}
