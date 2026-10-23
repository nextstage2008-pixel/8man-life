// サイトを開いた人の数（Cloudflare Web Analytics。Cookie を使わず、1人ずつを見分けない）。純粋な関数だけ（読み込むのは main.js）。
// 入れるのは、トークンがあり、サーバーのある版（Cloudflare）で、トラッキング拒否（DNT/GPC）でないときだけ。GitHub Pages の束は設定にトークンがない。
import { trackingRefused } from './minna.js';
import { serverEnabled } from './net.js';

export const BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';

// 開いた人の数を数える版か（トークンがあり、サーバーのある版）
export function analyticsOn(site) {
  return serverEnabled(site) && /^[0-9a-f]{32}$/.test(site?.analyticsToken ?? '');
}

export function analyticsBeacon(site, nav, win) {
  if (!analyticsOn(site) || trackingRefused(nav, win)) return null;
  return { src: BEACON_SRC, beacon: JSON.stringify({ token: site.analyticsToken }) };
}
