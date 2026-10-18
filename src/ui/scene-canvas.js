// 場面のドット絵を Canvas に描く（DOM 側）。部品の並びは core/scene.js の sceneLayout。角ばったまま拡大する。
const FONT = "'Zen Maru Gothic', sans-serif";

export function drawScene(canvas, layout, scale = 4) {
  canvas.width = layout.w * scale;
  canvas.height = layout.h * scale;
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  for (const it of layout.items) {
    g.fillStyle = it.color;
    if (it.kind === 'text') {
      g.font = `700 ${it.size * scale}px ${FONT}`;
      g.textBaseline = 'alphabetic';
      g.fillText(it.text, it.x * scale, it.y * scale);
    } else {
      g.fillRect(it.x * scale, it.y * scale, it.w * scale, it.h * scale);
    }
  }
  return canvas;
}
