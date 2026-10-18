// 札の画像を Canvas に描いて、PNG で保存する（DOM はここと main.js だけ）。配置は core/card-layout.js。
import { cardLayout } from './core/card-layout.js';
import { SITE } from './site.js';

const FONT = "'Zen Maru Gothic', sans-serif";

function roundRect(g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

export async function drawCard(canvas, layout) {
  // 札の字は画面と同じ丸ゴシック。読み込めなくても、ほかの字で描く
  try { await Promise.all([document.fonts.load(`700 64px ${FONT}`), document.fonts.load(`500 32px ${FONT}`)]); } catch { /* そのまま描く */ }
  canvas.width = layout.width;
  canvas.height = layout.height;
  const g = canvas.getContext('2d');
  for (const it of layout.items) {
    g.fillStyle = it.color;
    if (it.kind === 'rect') {
      roundRect(g, it.x, it.y, it.w, it.h, it.radius ?? 0);
      g.fill();
    } else {
      g.font = `${it.weight ?? 500} ${it.size}px ${FONT}`;
      g.textAlign = it.align ?? 'left';
      g.textBaseline = 'alphabetic';
      g.fillText(it.text, it.x, it.y);
    }
  }
  return canvas;
}

export async function saveCard(model) {
  const canvas = await drawCard(document.createElement('canvas'), cardLayout(model, { handle: SITE.authorHandle, scene: model.scene }));
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `8man-${model.seed}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
