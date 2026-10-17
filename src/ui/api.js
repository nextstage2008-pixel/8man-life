// サーバーとのやりとり（fetch の薄い殻）。失敗・時間切れ・サーバーなし（run.bat の配信）は null を返し、画面はそのまま動く。
// サーバーのない版（GitHub Pages）では、要求を1つも出さない（同じ住所のほかのゲームの所へ飛ばさない）
import { SITE } from './site.js';
import { serverEnabled } from './core/net.js';

async function call(path, init, timeoutMs, site) {
  if (!serverEnabled(site)) return null;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(path, { ...init, signal: ctl.signal });
    if (!r.ok) return null;
    if (r.status === 204) return {};
    return (r.headers.get('content-type') ?? '').includes('application/json') ? await r.json() : {};
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function postJson(path, body, { timeoutMs = 4000, site = SITE } = {}) {
  return call(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }, timeoutMs, site);
}

export function getJson(path, { timeoutMs = 4000, site = SITE } = {}) {
  return call(path, { method: 'GET' }, timeoutMs, site);
}
