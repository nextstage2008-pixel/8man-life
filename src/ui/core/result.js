// 最期と結果の画面と、札・投稿文のためのモデル（設計書6.7）。再生機の結果 { lines, summary, trace } から作る。
import { sceneOf, lastScene } from './scene.js';

const ROUTE_LABEL = { exam: '税理士試験', 'tax-office': '税務署', cpa: '公認会計士', lawyer: '弁護士' };
const ROUTE_FROM = { exam: '税理士試験から', 'tax-office': '税務署から', cpa: '公認会計士から', lawyer: '弁護士から' };
const PEER = {
  pass: a => `${a}歳で官報合格`, register: a => `${a}歳で登録`, kaigyo: a => `${a}歳で独立`, quit: a => `${a}歳で受験をやめる`,
  audit: a => `${a}歳まで監査法人`, tax: a => `${a}歳で税の仕事へ`, dokuritsu: a => `${a}歳で独立`,
  leave: a => `${a}歳で税務署を辞める`, ob: a => `${a}歳で税理士に`, shocho: a => `${a}歳で署長に`, death: a => `${a}歳で亡くなる`,
};

// 同じ年齢の帯の死因のうち、その死因の割合（自殺と表にない死因は null）
function causeShareAt(age, cause, data, era) {
  if (cause === 'suicide') return null;
  const band = data.LIFE[era].causeByAge.find(b => age >= b.from && age <= b.to) ?? data.LIFE[era].causeByAge.at(-1);
  const total = Object.values(band.causes).reduce((a, b) => a + b, 0);
  return band.causes[cause] != null && total > 0 ? band.causes[cause] / total : null;
}

// 科目の順：合格した年ごとに「・」でまとめ、「→」でつなぐ。大学院の認定で終わった人は免除をつける
function subjectLine(s, lines) {
  if (s.route === 'tax-office') return `税務署で${s.taxOfficeYears}年（試験の免除）`;
  if (s.route === 'cpa') return `公認会計士試験に${s.cpaPassAge}歳で合格`;
  if (s.route === 'lawyer') return `司法試験に${s.lawPassAge}歳で合格`;
  const groups = [];
  for (const x of s.subjectsOrder ?? []) {
    const g = groups.at(-1);
    if (g && g.age === x.age) g.names.push(x.name); else groups.push({ age: x.age, names: [x.name] });
  }
  const parts = groups.map(g => g.names.join('・'));
  const nintei = lines.filter(l => /国税審議会の認定を受け/.test(l.text));
  if (nintei.length) {
    // 分野は「残りの○○の科目が免除」で見る（税法の行の「あとは会計の科目です」に引っかからないように）
    const kinds = [...new Set(nintei.map(l => (/残りの会計の科目が免除/.test(l.text) ? '会計' : '税法')))];
    parts.push(kinds.length === 2 ? '大学院の免除（税法・会計）' : `大学院の免除（${kinds[0]}）`);
  }
  return parts.join(' → ');
}

function decided(s, id, k) { return s.decisions.find(d => d.id === id && d.k === k); }

// 投稿文の見どころ（その人に起きたことだけ・重みが高いほど残る）
function highlights(s) {
  const out = [];
  const add = (age, text, weight) => out.push({ age, text, weight });
  if (s.kaigyoAt != null) add(s.kaigyoAt, `${s.kaigyoAt}歳で独立`, 5);
  const tsugu = decided(s, 'tsugu', 'yes'); if (tsugu) add(tsugu.age + 1, `${tsugu.age + 1}歳で所長の事務所を継ぐ`, 5);
  const daihyo = decided(s, 'daihyo', 'yes'); if (daihyo) add(daihyo.age, `${daihyo.age}歳で代表社員に`, 4);
  const hojin = decided(s, 'hojinka', 'yes'); if (hojin) add(hojin.age, `${hojin.age}歳で税理士法人に`, 4);
  const uke = decided(s, 'yuzuriuke', 'yes'); if (uke) add(uke.age, `${uke.age}歳で事務所を譲り受ける`, 3);
  const kigyo = decided(s, 'to-kigyo', 'yes'); if (kigyo) add(kigyo.age, `${kigyo.age}歳で会社の中の税理士に`, 2);
  const modoru = decided(s, 'modoru', 'modoru'); if (modoru) add(modoru.age, `${modoru.age}歳で勤めに戻る`, 2);
  if (s.clientsMax >= 30) add(s.retiredAt ?? s.deathAge, `顧問先は最大${s.clientsMax}件`, 3);
  if (s.successor === 'yuzuru' && s.retiredAt != null) add(s.retiredAt, `${s.retiredAt}歳で事務所を譲る`, 2);
  else if (s.retiredAt != null) add(s.retiredAt, `${s.retiredAt}歳で引退`, 1);
  if (s.family.grandchildren.length) add(s.deathAge - 0.5, `孫は${s.family.grandchildren.length}人`, 2);
  return out.sort((a, b) => a.age - b.age).map(({ text, weight }) => ({ text, weight }));
}

function rarity(s, data) {
  const total = data.ROUTES.registrantsByFY[2025].total;
  const route = data.ROUTES.shareByEra[s.era][s.route].value;
  const female = data.ROUTES.femaleShareByRoute[s.era][s.route].value;
  const sex = s.sex === 'female' ? female : 1 - female;
  const all = data.PREFS.reduce((a, p) => a + p.births2000, 0);
  const pref = (data.PREFS.find(p => p.name === s.pref)?.births2000 ?? 0) / all;
  const count = Math.max(1, Math.round(total * route * sex * pref));
  const sexLabel = s.sex === 'female' ? '女性' : '男性';
  return {
    count,
    text: `${s.pref}生まれで、${ROUTE_FROM[s.route]}税理士になった${sexLabel}は、全国の税理士${total.toLocaleString('ja-JP')}人のうちおよそ${count.toLocaleString('ja-JP')}人（それぞれ独立と仮定した概算）`,
  };
}

// 同期4人のまとめ（札のための短い一行）。税理士になった人（登録・税務署から・税の仕事へ）と、道を離れた人（受験をやめた・税務署を辞めた）
function peerSummary(peers) {
  const has = (p, kinds) => p.outcomes.some(o => kinds.includes(o.kind));
  const became = peers.filter(p => has(p, ['register', 'ob', 'tax'])).length;
  const left = peers.filter(p => !has(p, ['register', 'ob', 'tax']) && has(p, ['quit', 'leave'])).length;
  const parts = [];
  if (became) parts.push(`${became}人が税理士に`);
  if (left) parts.push(`${left}人は道を離れた`);
  return parts.length ? parts.join(' · ') : `${peers.length}人とも別の道へ`;
}

export function resultModel({ lines, summary: s, trace }, data) {
  const finalAt = lines.findIndex(l => l.kind === 'loss' && l.final);
  const series = k => trace.map(t => Math.round(t.stats[k]));
  return {
    name: s.name, surname: s.surname, given: s.given, pref: s.pref, sex: s.sex, birthYear: s.birthYear, deathYear: s.birthYear + s.deathAge, deathAge: s.deathAge,
    cause: s.deathCause, causeLabel: data.CAUSES[s.deathCause]?.label ?? s.deathCause, causeShare: causeShareAt(s.deathAge, s.deathCause, data, s.era),
    gradExempt: lines.some(l => /国税審議会の認定を受け.*科目がそろいました/.test(l.text)),
    route: s.route, routeLabel: ROUTE_LABEL[s.route], aspireAge: s.aspireAge, passYears: s.passYears, taxOfficeYears: s.taxOfficeYears,
    subjectLine: subjectLine(s, lines),
    workLine: s.workplaces.join(' → ') + (decided(s, 'daihyo', 'yes') ? '（代表社員）' : ''),
    clientsMax: s.clientsMax ?? 0,
    peers: s.peers.map(p => ({ name: `${p.surname}${p.name}さん`, text: p.outcomes.map(o => (PEER[o.kind] ?? (a => `${a}歳`))(o.age)).join('・') })),
    peerSummary: peerSummary(s.peers),
    highlights: highlights(s),
    timeline: lines.filter(l => l.kind === 'big' && l.source !== 'history').map(l => ({ age: l.age, year: l.year, text: l.text })),
    stats: { hl: series('hl'), h: series('h'), sm: series('sm'), so: series('so') },
    money: s.money ? { ...s.money } : null,
    rarity: rarity(s, data),
    finalLines: finalAt >= 0 ? lines.slice(finalAt) : [],
    suicide: s.deathCause === 'suicide',
    seed: s.seed,
    // 最期の札の場面（最後の暮らし。題名と場面の絵の設計書 4.4）
    scene: (st => (st ? sceneOf(st) : null))(lastScene(lines)),
  };
}
