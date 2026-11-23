'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { underConstruction as uc } from '@/content/underConstruction';
import s from './UnderConstructionFooter.module.css';

/* ── Pixel wordmark: same technique as the name card (lib/pixelText.ts), plus hazard stripes ── */
const BLOCK = 4; // px per pixel
const FILL_H = 1.25; // letters are taller than the box, so the panel edge crops their bottom
const STRIPE = 4; // stripe width in pixels
const STEP_MS = 90; // stripes move one pixel every 90ms (~11 fps): stepped, mechanical
const APRICOT = [252, 184, 125]; // var(--apricot)
const DEEP_APRICOT = [246, 150, 72];

function drawWordmark(cv: HTMLCanvasElement, small: HTMLCanvasElement, text: string, offset: number) {
  const r = cv.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const W = Math.max(1, Math.round(r.width * dpr));
  const H = Math.max(1, Math.round(r.height * dpr));
  if (cv.width !== W) cv.width = W;
  if (cv.height !== H) cv.height = H;
  const px = Math.max(1, Math.round(BLOCK * dpr));
  const cols = Math.ceil(W / px);
  const rows = Math.ceil(H / px);
  small.width = cols;
  small.height = rows;
  const c = small.getContext('2d', { willReadFrequently: true });
  if (!c) return;
  c.clearRect(0, 0, cols, rows);
  // alignment BEFORE measuring (measuring first clipped the glyphs on the name card)
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  const font = (size: number) => `bold ${size}px Georgia, serif`;
  c.font = font(100);
  let m = c.measureText(text);
  const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight || m.width;
  const inkH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || 72;
  const size = Math.min((100 * cols * 0.98) / inkW, (100 * rows * FILL_H) / inkH);
  c.font = font(size);
  m = c.measureText(text);
  const L = m.actualBoundingBoxLeft || 0;
  const R = m.actualBoundingBoxRight || m.width;
  const asc = m.actualBoundingBoxAscent || size * 0.72;
  c.fillStyle = '#000';
  c.fillText(text, (cols - (R + L)) / 2 + L, rows + Math.round(asc * 0.08)); // baseline low: bottom cropped
  // hard alpha threshold, then recolour every solid pixel by diagonal band (hazard stripes)
  const img = c.getImageData(0, 0, cols, rows);
  const d = img.data;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      if (d[i + 3] < 110) {
        d[i + 3] = 0;
        continue;
      }
      const col = Math.floor((x + y + offset) / STRIPE) % 2 ? APRICOT : DEEP_APRICOT;
      d[i] = col[0];
      d[i + 1] = col[1];
      d[i + 2] = col[2];
      d[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  const v = cv.getContext('2d');
  if (!v) return;
  v.setTransform(1, 0, 0, 1, 0, 0);
  v.clearRect(0, 0, W, H);
  v.imageSmoothingEnabled = false;
  v.drawImage(small, 0, 0, cols * px, rows * px);
}

/**
 * Big Lemon "under construction" panel for the bottom of unfinished pages (opt-in per page).
 * Status + meanwhile columns, and a giant pixel wordmark whose apricot stripes slide in steps.
 */
export default function UnderConstructionFooter() {
  const path = usePathname();
  const footerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    const footer = footerRef.current;
    if (!cv || !footer) return;
    const small = document.createElement('canvas');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let offset = 0;
    let onScreen = false;
    let raf = 0;
    let last = 0;

    const draw = () => drawWordmark(cv, small, uc.wordmark, offset);
    const tick = (now: number) => {
      raf = 0;
      if (now - last >= STEP_MS) {
        last = now;
        offset -= 1; // stripes slide along the letters
        draw();
      }
      if (onScreen && !document.hidden) raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!reduced && onScreen && !document.hidden && !raf) raf = requestAnimationFrame(tick);
    };

    // pause off-screen and in hidden tabs
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      start();
    });
    io.observe(footer);
    const onVis = () => start();
    document.addEventListener('visibilitychange', onVis);
    const ro = new ResizeObserver(draw);
    ro.observe(cv);
    document.fonts?.ready.then(draw);
    draw();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <>
    <div className={s.push} aria-hidden="true" />
    <footer ref={footerRef} className={s.footer} aria-label={uc.label}>
      <div className={s.inner}>
        <div className={s.cols}>
          <div>
            <h2 className={s.pill}>{uc.status.label}</h2>
            <p className={s.big}>
              {uc.status.lines[0]}
              <br />
              {uc.status.lines[1]}
            </p>
          </div>
          <div>
            <h2 className={s.pill}>{uc.meanwhile.label}</h2>
            <p className={s.big}>
              {uc.meanwhile.links
                .filter((l) => l.href !== path)
                .map((l, i) => (
                  <span key={l.href}>
                    {i > 0 && <br />}
                    <a href={l.href}>{l.label}</a>
                  </span>
                ))}
            </p>
          </div>
        </div>
      </div>
      {/* decorative: the status text above says the same thing */}
      <div className={s.mark} aria-hidden="true">
        <canvas ref={canvasRef} className={s.canvas} />
      </div>
    </footer>
    </>
  );
}
