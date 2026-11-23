// Shared canvas pixel-text renderer (name card + FINISH bar).
// Draws text small, hard-thresholds alpha, then scales up nearest-neighbour: crisp pixels, never blurry.

export type PixelTextOptions = {
  text: string;
  /** Size of one "pixel" in CSS px. */
  block: number;
  /** Max share of the box width the ink may use (0.92 name, 0.98 FINISH). */
  fitW: number;
  color: string;
  font?: string;
  /** Element whose box is measured; defaults to the canvas itself. */
  measureEl?: Element;
};

const ALPHA_THRESHOLD = 110;
const smallCanvases = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

export function renderPixelText(canvas: HTMLCanvasElement, o: PixelTextOptions): void {
  const rect = (o.measureEl ?? canvas).getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const devW = Math.max(1, Math.round(Math.max(1, rect.width) * dpr));
  const devH = Math.max(1, Math.round(Math.max(1, rect.height) * dpr));
  if (canvas.width !== devW) canvas.width = devW;
  if (canvas.height !== devH) canvas.height = devH;

  const scale = Math.max(1, Math.round(o.block * dpr));
  const cols = Math.max(1, Math.ceil(devW / scale));
  const rows = Math.max(1, Math.ceil(devH / scale));

  let sm = smallCanvases.get(canvas);
  if (!sm) {
    sm = document.createElement('canvas');
    smallCanvases.set(canvas, sm);
  }
  sm.width = cols;
  sm.height = rows;
  const c = sm.getContext('2d', { willReadFrequently: true });
  if (!c) return;
  c.clearRect(0, 0, cols, rows);

  const font = o.font ?? 'Georgia, serif';
  const fontAt = (px: number) => `bold ${px}px ${font}`;

  // Alignment must be set BEFORE measuring (measuring first clipped the glyphs in the canvas).
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.font = fontAt(100);
  let m = c.measureText(o.text);
  const inkW = (m.actualBoundingBoxLeft + m.actualBoundingBoxRight || m.width) || 1;
  const inkH = (m.actualBoundingBoxAscent || 72) + (m.actualBoundingBoxDescent || 0) || 72;
  const size = Math.max(1, Math.min((100 * cols * o.fitW) / inkW, (100 * rows * 0.9) / inkH));
  c.font = fontAt(size);
  m = c.measureText(o.text);
  const L = m.actualBoundingBoxLeft || 0;
  const R = m.actualBoundingBoxRight || m.width / 2;
  const asc = m.actualBoundingBoxAscent || size * 0.72;
  const desc = m.actualBoundingBoxDescent || 0;
  c.fillStyle = o.color;
  c.fillText(o.text, cols / 2 - (R - L) / 2, rows / 2 + (asc - desc) / 2);

  // Hard alpha threshold: no soft edges.
  const img = c.getImageData(0, 0, cols, rows);
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= ALPHA_THRESHOLD ? 255 : 0;
  c.putImageData(img, 0, 0);

  const v = canvas.getContext('2d');
  if (!v) return;
  v.setTransform(1, 0, 0, 1, 0, 0);
  v.clearRect(0, 0, devW, devH);
  v.imageSmoothingEnabled = false;
  v.drawImage(sm, Math.floor((devW - cols * scale) / 2), Math.floor((devH - rows * scale) / 2), cols * scale, rows * scale);
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
