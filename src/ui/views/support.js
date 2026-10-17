// 相談先の文を HTML にする（設計書6.6）。決まった番号は電話をかけられるリンク、決まった案内の住所は開けるリンクにする。
// 文は相談先の一覧（src/data/events/family.js）の固定の文で、ほかの字はすべて逃がす。
import { esc } from '../core/escape.js';

const LINKS = [
  ['0570-064-556', '<a href="tel:0570064556">0570-064-556</a>'],
  ['https://www.mhlw.go.jp/mamorouyokokoro/', '<a href="https://www.mhlw.go.jp/mamorouyokokoro/" rel="noopener" target="_blank">https://www.mhlw.go.jp/mamorouyokokoro/</a>'],
];

export function supportHtml(text) {
  let h = esc(text);
  for (const [plain, link] of LINKS) h = h.split(esc(plain)).join(link);
  return h;
}
