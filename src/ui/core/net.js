// サーバーに送る中身の組み立て（純粋な関数だけ。送るのは src/ui/api.js）。
const ID_RE = /^[a-km-np-z2-9]{10,16}$/;

// サーバーがあるか（GitHub Pages の版は server: false。書いていなければあり）
export function serverEnabled(site = {}) {
  return site.server !== false;
}

// 投稿に使う URL。サーバーが共有ページを作れたら /s/{id}、作れなければ再現リンク（fallback）のまま。
// fallback に # がない人生（判定止めで再現を付けられない人生）は、サーバーに送らずそのまま返す
export async function resolveShareUrl(send, { info, fallback, origin }) {
  if (!String(fallback).includes('#')) return fallback;
  try {
    const r = await send('/api/share', { v: info.version, s: info.seed, m: info.birthMode === 'population' ? 'p' : 'b', a: info.answers.join('') });
    if (r && typeof r.id === 'string' && ID_RE.test(r.id)) return `${origin}/s/${r.id}`;
  } catch {
    /* サーバーがなくても投稿はできる */
  }
  return fallback;
}

// 投稿用に先に開いておいた窓を、投稿の住所へ移す。人が窓を閉じていたら何もしない（やめたとみなし、元の画面を残す）。
// 窓が開けなかった（null）ときは false を返し、呼ぶ側が今の窓で移る
export function openPostWindow(win, href) {
  if (!win || win.closed) return false;
  win.location.href = href;
  return true;
}

const SCREEN_LABEL = { start: '最初の画面', life: '人生の画面', end: '最期の画面' };
const CONTEXT_KEYS = ['seed', 'mode', 'answers', 'age', 'year', 'screen', 'lastLine'];
const cut = (s, n) => [...String(s)].slice(0, n).join('');

// ご意見の中身。人生の情報は決まった項目だけ（振り返りやひとことは入れない）。最後の行は200字・文は1000字まで
export function feedbackPayload({ version, kind, text, context = {} }) {
  const c = {};
  for (const k of CONTEXT_KEYS) if (context[k] !== undefined && context[k] !== null) c[k] = context[k];
  if (c.lastLine !== undefined) c.lastLine = cut(c.lastLine, 200);
  return { v: version, kind, text: cut(String(text ?? '').trim(), 1000), context: c };
}

// 板に出す「一緒に送る情報」の一行
export function feedbackContextLine(context = {}, version = '') {
  const parts = [];
  if (version) parts.push(`版 ${version}`);
  if (context.seed != null) parts.push(`種 ${context.seed}`);
  if (context.age != null) parts.push(context.year != null ? `${context.age}歳（${context.year}年）` : `${context.age}歳`);
  parts.push(SCREEN_LABEL[context.screen] ?? SCREEN_LABEL.start);
  return `一緒に送る情報：${parts.join('・')}`;
}
