// HTML に入れる文字を逃がす。画面の文はすべてこれを通す（名前や記入の文に < があっても壊れない）。
const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(text) {
  return String(text ?? '').replace(/[&<>"']/g, ch => MAP[ch]);
}
