// 「作 Yasu@」の表記。X のプロフィールの住所があればリンクにする（設計書2節）。
import { esc } from '../core/escape.js';

export function authorLink(site = {}) {
  return site.authorUrl ? `<a class="author-link" href="${esc(site.authorUrl)}" rel="noopener" target="_blank">作 Yasu@</a>` : '作 Yasu@';
}
