// 安全の作り（設計書6.6）。振り返りの記入欄に危ない言葉が書かれたら、相談先を出し、その端末では30日間、自殺の判定を止める。
const DANGER_WORDS = [
  '死にたい', 'しにたい', '消えたい', 'きえたい', '自殺', 'じさつ', '生きていたくない', 'いきていたくない',
  '終わりにしたい', 'おわりにしたい', 'いなくなりたい', '死のう', 'しのう', '死んでしまいたい', 'しんでしまいたい',
];
const KEY = '8man.suppressUntil';
const DAYS = 30;

// 全角・半角をそろえ（NFKC）、空白を除き、カタカナをひらがなにする
function normalize(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

export function hasDanger(text) {
  const t = normalize(text);
  return t.length > 0 && DANGER_WORDS.some(w => t.includes(w));
}

export function markSuppressed(storage, nowMs) {
  try { storage?.setItem(KEY, String(nowMs + DAYS * 24 * 60 * 60 * 1000)); } catch { /* 端末に残せなくても続ける */ }
}

export function isSuppressed(storage, nowMs) {
  try {
    const until = Number(storage?.getItem(KEY));
    return Number.isFinite(until) && until > nowMs;
  } catch {
    return false;
  }
}

// 危ない言葉を2回書いても、判定止めは最初に書いた年齢（または端末の30日の止めの 0）から
export function suppressFromAfter(current, age) {
  return current ?? age;
}
