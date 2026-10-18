import { createPlayer } from './player.js';

// 再現リンクと X の投稿文。手で書いた文（振り返り・ひとこと）はどちらにも入れない（設計書6.8）。
// 再現リンクの形：#v=データの版&s=種&m=b（出生数）|p（人口）&a=答えの番号を1けたずつ&p=判定を止めた年齢（あれば）

export function answerIndexes(views, decisions) {
  return decisions.map((d, i) => views[i].choices.findIndex(c => c.k === d.k));
}

export function encodeReplay({ version, seed, birthMode, answers, suppressFrom }) {
  let h = `#v=${version}&s=${seed}&m=${birthMode === 'population' ? 'p' : 'b'}&a=${answers.join('')}`;
  if (suppressFrom != null) h += `&p=${suppressFrom}`;
  return h;
}

export function decodeReplay(hash, currentVersion) {
  const q = new URLSearchParams(String(hash ?? '').replace(/^#/, ''));
  const v = q.get('v'), s = q.get('s'), m = q.get('m'), a = q.get('a'), p = q.get('p');
  const broken = { ok: false, reason: 'broken' };
  if (!v || !s || !/^\d+$/.test(s) || !['b', 'p'].includes(m) || a == null || !/^\d*$/.test(a)) return broken;
  if (p != null && !/^\d+$/.test(p)) return broken;
  if (v !== currentVersion) return { ok: false, reason: 'version' };
  const out = { ok: true, seed: Number(s), birthMode: m === 'p' ? 'population' : 'births', answers: [...a].map(Number) };
  if (p != null) out.suppressFrom = Number(p);
  return out;
}

// X の数え方：URL は23、U+0000〜U+10FF と一部の記号は1、ほか（全角など）は2
const ONE = [[0, 4351], [8192, 8205], [8208, 8223], [8242, 8247]];
export function xLength(text) {
  let n = 0;
  const rest = String(text).replace(/https?:\/\/\S+/g, () => { n += 23; return ''; });
  for (const ch of rest) {
    const c = ch.codePointAt(0);
    n += ONE.some(([a, b]) => c >= a && c <= b) ? 1 : 2;
  }
  return n;
}

// 道ごとの書き出し（共有ページの説明にも使う）
export function introText(m) {
  const who = `${m.pref}に生まれ、${m.aspireAge}歳で`;
  if (m.route === 'tax-office') return `${who}税務署に入った${m.name}は、${m.taxOfficeYears}年勤めて税理士に。`;
  if (m.route === 'cpa') return `${who}公認会計士を志した${m.name}は、監査法人を経て税理士に。`;
  if (m.route === 'lawyer') return `${who}弁護士を志した${m.name}は、弁護士から税理士に。`;
  // 大学院の認定で最後の科目がそろった人は試験免除者（官報合格ではない）
  if (m.gradExempt) return `${who}税理士を志した${m.name}は、${m.passYears}年かけて、大学院の免除で科目をそろえる。`;
  return `${who}税理士を志した${m.name}は、${m.passYears}年かけて官報合格。`;
}

const deathText = m => `…${m.deathAge}歳で${m.causeLabel}で亡くなりました。`;

// 一生を1文で（見どころなし）。共有ページの説明に使う
export function lifeSentence(m) {
  return `${introText(m)}${deathText(m)}`;
}

// 投稿文（設計書6.7の型）。280に収まるまで、重みの低い見どころから落とす
// handle：作者の X のアカウント名（あれば「作 Yasu@（@名前）」にして、投稿から作者のアカウントへたどれるようにする）
export function postText(m, url, { handle = '' } = {}) {
  const author = handle ? `作 Yasu@（@${handle}）` : '作 Yasu@';
  const build = kept => {
    const hl = kept.length ? `${kept.map(h => h.text).join('、')}。` : '';
    return `【8万分の1】${introText(m)}${hl}${deathText(m)}\n#8万分の1\n${author}\n${url}`;
  };
  let kept = [...(m.highlights ?? [])];
  while (kept.length && xLength(build(kept)) > 280) {
    const low = kept.reduce((a, b) => (b.weight < a.weight ? b : a));
    kept = kept.filter(h => h !== low);
  }
  return build(kept);
}

export function xIntentUrl(text) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

// 公開する再現リンク。判定止めの年齢（振り返りに危ない言葉を書いた年齢）は外に出さない。
// 外すと最期が変わる人生（判定止めが自殺を防いだ人生）は、再現の部分を付けずにトップの URL だけにする
export function shareLink(base, info, expected, data, world) {
  const p = createPlayer({ seed: info.seed, era: 'heisei', birthMode: info.birthMode }, { data, world, answers: info.answers });
  for (let n = 0; n < 100000 && p.state !== 'ended'; n++) {
    p.tick(1);
    if (p.state === 'decision') p.answer();
  }
  const same = p.summary && p.summary.deathAge === expected.deathAge && p.summary.deathCause === expected.deathCause;
  return same ? base + encodeReplay({ ...info, suppressFrom: undefined }) : base;
}
