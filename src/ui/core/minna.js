// みんなの集計の、画面の側の計算（送る中身・トラッキング拒否の判定・見せる値）。純粋な関数だけ。
export const MIN_COUNT = 30; // これより少ない件数の割合は出さない
const MAX_CHOICES = 120; // サーバーが受ける数と同じ

// トラッキング拒否（DNT/GPC）。端末の navigator と、古いブラウザの doNotTrack を引数で受ける
export function trackingRefused(nav, win) {
  return nav?.doNotTrack === '1' || win?.doNotTrack === '1' || nav?.globalPrivacyControl === true;
}

// 送る中身。名前・振り返り・ひとことは入れない。分かれ道は id ごとに最初の答えだけ（ひと息は除く）
export function livesPayload(summary, version) {
  const seen = new Set();
  const choices = [];
  for (const d of summary.decisions ?? []) {
    if (d.id === 'reflect' || seen.has(d.id)) continue;
    seen.add(d.id);
    choices.push({ id: d.id, k: d.k });
  }
  return {
    v: version,
    route: summary.route,
    passYears: summary.route === 'exam' ? (summary.passYears ?? null) : null,
    deathAge: summary.deathAge,
    choices: choices.slice(0, MAX_CHOICES),
  };
}

// 自分が答えた分かれ道ごとの「みんなのX%が同じ選択」。件数が min 以上の分かれ道だけ
export function sameChoiceRows(stats, views, decisions, min = MIN_COUNT) {
  if (!stats?.decisions) return [];
  const seen = new Set();
  const rows = [];
  decisions.forEach((d, i) => {
    if (d.id === 'reflect' || seen.has(d.id)) return;
    seen.add(d.id);
    const agg = stats.decisions[d.id];
    const view = views[i]?.id === d.id ? views[i] : views.find(v => v.id === d.id);
    const label = view?.choices.find(c => c.k === d.k)?.label;
    if (!agg || !label || !(agg.total >= min)) return;
    rows.push({ title: view.title, label, pct: Math.round(((agg.by?.[d.k] ?? 0) / agg.total) * 100) });
  });
  return rows;
}

const bucket = y => (y >= 16 ? '16+' : String(y));

// 合格までの年数の分布（試験組）。合計が min 未満か、自分の年数がなければ null
export function passYearsChart(stats, myYears, min = MIN_COUNT) {
  if (myYears == null || !stats?.pass) return null;
  const entries = Object.entries(stats.pass).map(([y, n]) => [Number(y), Number(n)]).filter(([y, n]) => Number.isInteger(y) && y >= 1 && n > 0);
  const total = entries.reduce((a, [, n]) => a + n, 0);
  if (total < min) return null;
  const bars = [...Array.from({ length: 15 }, (_, i) => String(i + 1)), '16+'].map(years => ({ years, n: 0, mine: false }));
  for (const [y, n] of entries) bars.find(b => b.years === bucket(y)).n += n;
  bars.find(b => b.years === bucket(myYears)).mine = true;
  const faster = entries.filter(([y]) => y < myYears).reduce((a, [, n]) => a + n, 0);
  return { total, bars, fasterPct: Math.round((faster / total) * 100) };
}
