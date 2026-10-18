// 最初の画面の点の日本地図（題名と場面の絵の設計書 4.2）。都道府県ごとの丸の大きさは、その県の2000年の出生数
// （ゲームが生まれる県を引くときの数）の平方根。うすい点の格子の上に置き、沖縄は左下の枠に寄せて描く。本家の地図は写さない。
// 投影は先生に見せた見本（mock 3）と同じ（経度 127.6〜146.2・緯度 29.2〜45.6 を枠いっぱいに）。
const LON0 = 127.6, LON1 = 146.2, LAT0 = 29.2, LAT1 = 45.6;
// 沖縄の丸を描く所と、そのまわりの点線の枠
const OKINAWA = { lat: 29.8, lon: 128.6 };
const OKINAWA_BOX = { lat: 30.9, lon: 127.9, w: 34, h: 30 };

export function japanMapSvg(prefs, geo, { w = 390, h = 230 } = {}) {
  const x = lon => 10 + ((lon - LON0) / (LON1 - LON0)) * (w - 20);
  const y = lat => h - 8 - ((lat - LAT0) / (LAT1 - LAT0)) * (h - 16);
  const max = Math.max(...prefs.map(p => p.births2000));
  const grid = [];
  for (let gx = 6; gx < w; gx += 10) for (let gy = 6; gy < h; gy += 10) grid.push(`<circle cx="${gx}" cy="${gy}" r="1.1"></circle>`);
  const dots = [];
  for (const p of prefs) {
    for (const [lat, lon, share] of geo[p.name] ?? []) {
      const at = p.name === '沖縄県' ? OKINAWA : { lat, lon };
      const r = 3 + 11 * Math.sqrt((p.births2000 * share) / max);
      dots.push(`<circle class="pref-dot" data-pref="${p.name}" cx="${x(at.lon).toFixed(1)}" cy="${y(at.lat).toFixed(1)}" r="${r.toFixed(1)}"></circle>`);
    }
  }
  const box = `<rect class="okinawa-box" x="${x(OKINAWA_BOX.lon).toFixed(1)}" y="${y(OKINAWA_BOX.lat).toFixed(1)}" width="${OKINAWA_BOX.w}" height="${OKINAWA_BOX.h}" rx="4"></rect>`;
  return `<svg class="jp-map" viewBox="0 0 ${w} ${h}" role="img" aria-label="都道府県ごとの、生まれる赤ちゃんの数の地図（丸が大きいほど多い）"><g class="jp-grid">${grid.join('')}</g>${box}<g class="jp-dots">${dots.join('')}</g></svg>`;
}

// 灯す県を出生数の重みで選ぶ。u は 0 以上 1 未満（乱数は画面の側で作る）
export function pickLitPref(prefs, u) {
  const total = prefs.reduce((a, p) => a + p.births2000, 0);
  let at = u * total;
  for (const p of prefs) {
    if (at < p.births2000) return p.name;
    at -= p.births2000;
  }
  return prefs[prefs.length - 1].name;
}
