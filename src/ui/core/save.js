// 人生の途中の保存（続きから）。分かれ道に答えるたびに「版・種・決め方・答えの番号の列」を端末に残す。
// 版が違う保存は捨てる（同じ種でも違う人生になるため）。端末に残せなくても落ちない。
const KEY = '8man.progress';

export function saveProgress(storage, p) {
  try { storage?.setItem(KEY, JSON.stringify(p)); } catch { /* 残せなくても続ける */ }
}

export function loadProgress(storage, currentVersion) {
  try {
    const p = JSON.parse(storage?.getItem(KEY) ?? 'null');
    const ok = p && p.version === currentVersion && Number.isInteger(p.seed) && ['births', 'population'].includes(p.birthMode)
      && Array.isArray(p.answers) && p.answers.every(n => Number.isInteger(n) && n >= 0)
      && (p.suppressFrom == null || Number.isInteger(p.suppressFrom));
    return ok ? p : null;
  } catch {
    return null;
  }
}

export function clearProgress(storage) {
  try { storage?.removeItem(KEY); } catch { /* 消せなくても続ける */ }
}

// 最期まで見た人生が、保存してある自分の人生と同じときだけ「続きから」を消す（人の再現リンクでは消さない）
export function shouldClearProgress(saved, config) {
  return !!saved && saved.seed === config.seed && saved.birthMode === config.birthMode;
}
