// 場面のドット絵（題名と場面の絵の設計書 4.4）。どの場面を描くか・誰を描くか・一行の説明・絵の部品（四角の並び）を、
// 行に添えた場面の状態（engine/scene-state.js）から決める。描くのは src/ui/scene-canvas.js。本家の絵は写さない。
export const SCENE_KEYS = ['home', 'school', 'desk', 'jimusho', 'keiri', 'zeimusho', 'kansa', 'houritsu', 'own', 'engawa'];
// 家族を描く場面（家の中や家の前）。職場と学校は本人と同僚（友だち）1人で、家族は一行の説明にだけ出す（家族の年は家の場面になる）
export const FAMILY_SCENES = ['home', 'desk', 'engawa'];

const W = 128, H = 40, GY = 33; // 低い解像度の升目と、地面の高さ
const MAX_FIGURES = 5;
const KAN = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const kan = n => KAN[n] ?? String(n);

const STYLE = { kaigyo: '開業の税理士', shozoku: '勤務の税理士', shain: '社員税理士', kigyonai: '企業内税理士' };
const PHASE = { 'tax-office': '税務署の職員', 'cpa-exam': '会計士試験の受験生', cpa: '監査法人の会計士', 'law-exam': '司法試験の受験生', lawyer: '弁護士', passed: '登録の準備中', retired: '引退' };
const STUDY = ['aspirant', 'examinee', 'cpa-exam', 'law-exam', 'passed'];

const inSchool = s => s.age <= 18 || (s.age <= 22 && s.univ !== false);

// 家族の年（結婚・子の誕生・親と同居の年と次の年）は、職場や学校の立場でも、一緒に暮らす人がいれば家の場面にする
function keyOf(s) {
  const key = workKeyOf(s);
  const together = s.spouse || s.kids.length > 0 || s.parents.length > 0;
  return s.familyYear && together && !FAMILY_SCENES.includes(key) ? 'home' : key;
}

function workKeyOf(s) {
  if (s.phase === 'retired') return 'engawa';
  if (s.phase === 'registered') return { kaigyo: 'own', kigyonai: 'keiri' }[s.workStyle] ?? 'jimusho';
  if (s.phase === 'tax-office') return 'zeimusho';
  if (s.phase === 'cpa') return 'kansa';
  if (s.phase === 'lawyer') return 'houritsu';
  if (STUDY.includes(s.phase)) return s.job === 'jimusho' ? 'jimusho' : s.job === 'keiri' ? 'keiri' : 'desk';
  if (s.age <= 5) return 'home';
  return inSchool(s) ? 'school' : 'keiri';
}

function roleOf(s) {
  if (s.phase === 'registered') return STYLE[s.workStyle] ?? '税理士';
  if (s.phase === 'aspirant' || s.phase === 'examinee') return s.job === 'jimusho' ? '会計事務所の補助者' : s.job === 'keiri' ? '会社の経理' : '受験生';
  if (PHASE[s.phase]) return PHASE[s.phase];
  if (s.age <= 5) return '子ども';
  return inSchool(s) ? '学生' : '会社員';
}

function familyText(s) {
  if (s.apart) return s.grandkids ? `単身赴任、孫${kan(s.grandkids)}人` : '単身赴任';
  const parts = [];
  if (s.spouse) parts.push(s.sex === 'female' ? '夫' : '妻');
  if (s.kids.length) parts.push(`子ども${kan(s.kids.length)}人`);
  if (s.parents.length) parts.push(s.parents.length >= 2 ? '両親' : '親');
  if (s.siblings.length) parts.push(`きょうだい${kan(s.siblings.length)}人`);
  const base = parts.length ? `${parts.join('と')}と` : 'ひとり暮らし';
  return s.grandkids ? `${base}、孫${kan(s.grandkids)}人` : base;
}

function figuresOf(s, key) {
  const self = { who: 'self', age: s.age, sex: s.sex };
  if (!FAMILY_SCENES.includes(key)) return [self, { who: key === 'school' ? 'friend' : 'colleague', age: s.age, sex: s.sex === 'male' ? 'female' : 'male' }];
  const out = [self];
  if (s.spouse) out.push({ who: 'spouse', age: s.age, sex: s.sex === 'male' ? 'female' : 'male' });
  // 家族は文と同じ男女と年で（子は年の若い順）
  [...s.kids].sort((a, b) => a.age - b.age).forEach(k => out.push({ who: 'kid', age: k.age, sex: k.sex }));
  for (const p of s.parents) out.push({ who: 'parent', age: s.age + 30, sex: p.sex });
  for (const b of s.siblings) out.push({ who: 'sibling', age: b.age, sex: b.sex });
  return out.slice(0, MAX_FIGURES);
}

export function sceneOf(s) {
  const key = keyOf(s);
  return { key, figures: figuresOf(s, key), caption: `${s.residence}・${roleOf(s)}・${familyText(s)}`, surname: s.surname ?? '' };
}

// ── 絵の部品 ──
const C = {
  sky: '#CFE3F5', night: '#26344C', sun: '#F4C95D', moon: '#F2EBC9', cloud: '#FFFFFF', grass: '#8DB580', wood: '#B98E62', woodDark: '#7A5236',
  wall: '#EEF1F5', paper: '#FFFFFF', glass: '#9CC3E6', blue: '#2C5AA0', orange: '#B5521A', ink: '#1D2733', gray: '#7A8CA3', light: '#C8CED6',
  leaf: '#5E9A5A', skin: '#F2C9A0', legs: '#3A3A3A', desk: '#C9B79C', shoji: '#F7F1E3', shojiLine: '#C9B79C',
};
const SHIRT = { self: C.blue, spouse: C.orange, kid: '#E8B04B', parent: '#7A8CA3', sibling: '#6FA86A', colleague: '#4E5B6B', friend: '#6FA86A' };

function hairOf(age, i) {
  if (age >= 75) return '#DADADA';
  if (age >= 55) return '#9A9A9A';
  return i % 3 === 2 ? '#5A3A22' : '#2B2B2B';
}

// 背丈（升目）。子は実際の年齢の背丈で
function heightOf(age) {
  if (age <= 1) return 5;
  if (age <= 5) return 9;
  if (age <= 12) return 11;
  if (age <= 17 || age >= 80) return 13;
  return 14;
}

// 人の形（足元が y = GY・頭は4升・体は6升）。part は主人公なら 'self'
function figure(items, x, f, i) {
  const h = heightOf(f.age), top = GY - h, part = f.who === 'self' ? 'self' : f.who;
  const R = (rx, ry, rw, rh, color) => items.push({ x: rx, y: ry, w: rw, h: rh, color, part });
  if (h === 5) { // 赤ちゃん（おくるみ）
    R(x, top, 4, 2, C.skin);
    R(x, top + 2, 4, 3, C.paper);
    return;
  }
  const hair = hairOf(f.age, i);
  R(x, top, 4, 4, C.skin);
  R(x, top, 4, 1, hair);
  if (f.sex === 'female') { R(x, top + 1, 1, 3, hair); R(x + 3, top + 1, 1, 3, hair); }
  R(x + 1, top + 2, 1, 1, C.ink); R(x + 2, top + 2, 1, 1, C.ink); // 目
  const legs = h >= 11 ? 3 : 2;
  R(x - 1, top + 4, 6, h - 4 - legs, SHIRT[f.who] ?? C.gray);
  R(x, GY - legs, 1, legs, C.legs);
  R(x + 3, GY - legs, 1, legs, C.legs);
}

function rect(items, x, y, w, h, color) { items.push({ x, y, w, h, color }); }
function text(items, t, x, y, size, color) { items.push({ kind: 'text', text: t, x, y, size, color }); }

function outdoorSky(items) {
  rect(items, 0, 0, W, GY, C.sky);
  rect(items, 112, 3, 5, 5, C.sun);
  rect(items, 70, 4, 12, 2, C.cloud); rect(items, 73, 2, 6, 2, C.cloud);
  rect(items, 20, 6, 10, 2, C.cloud);
}

const BACKGROUND = {
  home(items) {
    outdoorSky(items);
    rect(items, 0, GY, W, H - GY, C.grass);
    rect(items, 10, 20, 32, 13, '#F3E6D3');
    rect(items, 8, 18, 36, 2, C.orange); rect(items, 12, 15, 28, 3, C.orange); rect(items, 16, 12, 20, 3, C.orange);
    rect(items, 22, 25, 6, 8, C.woodDark); rect(items, 32, 23, 6, 5, C.glass);
    rect(items, 53, 26, 2, 7, C.woodDark); rect(items, 50, 19, 8, 8, C.leaf);
  },
  school(items) {
    outdoorSky(items);
    rect(items, 0, GY, W, H - GY, '#D8C9A3');
    rect(items, 4, 12, 70, 21, '#EDE7DA'); rect(items, 4, 11, 70, 1, C.gray);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) rect(items, 8 + i * 11, 15 + r * 8, 7, 5, C.glass);
    rect(items, 36, 6, 6, 5, C.paper); rect(items, 38, 7, 1, 2, C.ink);
  },
  desk(items) {
    rect(items, 0, 0, W, GY, C.night);
    rect(items, 8, 5, 20, 15, '#3B4C6B'); rect(items, 9, 6, 18, 13, '#1D2733'); rect(items, 20, 8, 3, 3, C.moon);
    rect(items, 12, 12, 1, 1, C.moon); rect(items, 15, 9, 1, 1, C.moon);
    rect(items, 0, GY, W, H - GY, '#5B4636');
    rect(items, 30, 24, 34, 3, '#8A6A4A'); rect(items, 31, 27, 2, 6, '#6B4E36'); rect(items, 61, 27, 2, 6, '#6B4E36');
    rect(items, 34, 21, 9, 3, C.orange); rect(items, 35, 18, 8, 3, C.blue); rect(items, 34, 15, 9, 3, C.leaf);
    rect(items, 55, 15, 2, 9, '#C9C9C9'); rect(items, 52, 13, 8, 3, C.sun);
    rect(items, 70, 7, 10, 10, C.paper); rect(items, 70, 7, 10, 2, '#D0453A'); rect(items, 76, 12, 2, 2, '#D0453A');
  },
  jimusho(items) {
    rect(items, 0, 0, W, GY, C.wall);
    rect(items, 6, 5, 20, 12, C.gray); rect(items, 7, 6, 18, 10, C.sky);
    rect(items, 96, 8, 26, 25, C.desk);
    for (let i = 0; i < 6; i++) { rect(items, 98 + i * 4, 10, 3, 9, [C.blue, C.orange, C.leaf][i % 3]); rect(items, 98 + i * 4, 21, 3, 9, [C.leaf, C.blue, C.orange][i % 3]); }
    rect(items, 0, GY, W, H - GY, C.light);
    for (const dx of [28, 60]) {
      rect(items, dx, 24, 26, 3, C.desk);
      rect(items, dx + 6, 16, 10, 7, C.ink); rect(items, dx + 7, 17, 8, 5, C.glass); rect(items, dx + 10, 23, 2, 1, C.ink);
    }
    rect(items, 48, 21, 5, 3, C.paper);
  },
  keiri(items) {
    rect(items, 0, 0, W, GY, '#F1F1EC');
    rect(items, 8, 4, 40, 14, C.gray); rect(items, 9, 5, 38, 12, '#BFD6EC');
    for (let i = 0; i < 5; i++) rect(items, 11 + i * 7, 9 + (i % 2) * 2, 5, 8 - (i % 2) * 2, '#9DB4CF');
    rect(items, 104, 6, 7, 7, C.paper); rect(items, 107, 7, 1, 3, C.ink);
    rect(items, 0, GY, W, H - GY, C.light);
    rect(items, 30, 24, 40, 3, C.desk); rect(items, 54, 21, 6, 3, C.gray); rect(items, 55, 22, 1, 1, C.paper); rect(items, 57, 22, 1, 1, C.paper);
    rect(items, 36, 21, 8, 3, C.paper); rect(items, 37, 19, 6, 2, C.paper);
    rect(items, 78, 24, 30, 3, C.desk); rect(items, 84, 17, 9, 6, C.ink); rect(items, 85, 18, 7, 4, C.glass);
  },
  zeimusho(items) {
    rect(items, 0, 0, W, GY, '#E7EDF2');
    rect(items, 46, 3, 36, 9, C.blue);
    text(items, '税務署', 53, 10, 6, C.paper);
    rect(items, 6, 6, 16, 10, C.gray); rect(items, 7, 7, 14, 8, C.sky);
    rect(items, 100, 6, 18, 10, C.gray); rect(items, 101, 7, 16, 8, C.sky);
    rect(items, 0, GY, W, H - GY, C.light);
  },
  kansa(items) {
    rect(items, 0, 0, W, GY, '#DDE6EF');
    rect(items, 4, 3, 60, 24, C.gray); rect(items, 5, 4, 58, 22, '#B8D2EA');
    for (const [bx, bh] of [[8, 14], [18, 19], [30, 11], [40, 16], [52, 20]]) rect(items, bx, 26 - bh, 8, bh, '#8FB0D2');
    rect(items, 0, GY, W, H - GY, C.light);
    rect(items, 66, 24, 52, 3, '#8C9AAB'); rect(items, 72, 21, 7, 3, C.ink); rect(items, 104, 21, 7, 3, C.ink);
    rect(items, 88, 22, 6, 2, C.paper);
  },
  houritsu(items) {
    rect(items, 0, 0, W, GY, '#EFE8DD');
    rect(items, 4, 5, 40, 28, C.woodDark);
    const spines = ['#8E3B2F', '#2C5AA0', '#5E9A5A', '#B5521A', '#3A3A3A', '#7A5236'];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) rect(items, 6 + i * 4, 7 + r * 9, 3, 7, spines[(i + r) % spines.length]);
    rect(items, 0, GY, W, H - GY, '#C9B79C');
    rect(items, 60, 24, 32, 3, '#6B4E36'); rect(items, 70, 21, 8, 3, C.orange); rect(items, 80, 22, 6, 2, C.paper);
  },
  own(items, sc) {
    outdoorSky(items);
    rect(items, 0, GY, W, H - GY, C.light);
    rect(items, 10, 8, 70, 25, '#F3EEE6');
    rect(items, 16, 19, 14, 8, C.glass); rect(items, 60, 19, 14, 8, C.glass); rect(items, 40, 22, 10, 11, C.gray);
    rect(items, 18, 9, 54, 8, C.paper); rect(items, 18, 9, 54, 1, C.blue); rect(items, 18, 16, 54, 1, C.blue);
    const sign = `${sc.surname || ''}税理士事務所`;
    const size = Math.min(6, Math.floor(50 / sign.length));
    text(items, sign, 45 - (sign.length * size) / 2, 15, size, C.ink);
  },
  engawa(items) {
    outdoorSky(items);
    rect(items, 0, 3, 72, 2, '#5B4636');
    rect(items, 0, 5, 64, 23, C.shoji);
    for (let i = 1; i < 4; i++) rect(items, i * 16, 5, 1, 23, C.shojiLine);
    for (let r = 1; r < 3; r++) rect(items, 0, 5 + r * 7, 64, 1, C.shojiLine);
    rect(items, 0, 28, W, 5, '#A97C50'); rect(items, 0, 32, W, 1, '#7A5236');
    rect(items, 0, GY, W, H - GY, C.grass);
    rect(items, 106, 18, 2, 10, C.woodDark); rect(items, 100, 10, 14, 10, C.leaf);
    rect(items, 44, 26, 3, 2, C.paper);
  },
};

// 人を立たせる所（場面ごとに、1人めから順の左の端）。受験の机は、本人は机の横・家族は離れて立つ
const SPOT = {
  home: [62, 71, 80, 89, 98], school: [84, 98], desk: [22, 80, 89, 98, 107], jimusho: [21, 55], keiri: [23, 73],
  zeimusho: [40, 80], kansa: [68, 98], houritsu: [50, 98], own: [88, 100], engawa: [68, 77, 86, 95, 104],
};

export function sceneLayout(sc, { w = W, h = H } = {}) {
  const items = [];
  BACKGROUND[sc.key](items, sc);
  sc.figures.forEach((f, i) => figure(items, Math.min(SPOT[sc.key][i] ?? W - 6, W - 6), f, i));
  // 税務署の受付の台は、人の前（腰の高さ）に置く
  if (sc.key === 'zeimusho') { rect(items, 0, 26, W, 7, '#B9A27F'); rect(items, 0, 26, W, 1, '#8A6A4A'); }
  return { w, h, items };
}

// 最期の札の場面：亡くなる行より前の、いちばん後の暮らしの状態（亡くなる場面は描かない）
export function lastScene(lines) {
  for (let i = lines.length - 1; i >= 0; i--) if (lines[i].scene?.alive) return lines[i].scene;
  return lines.at(-1)?.scene ?? null;
}
