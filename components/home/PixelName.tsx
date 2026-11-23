'use client';

import { useEffect, useRef } from 'react';
import { renderPixelText, prefersReducedMotion } from '@/lib/pixelText';
import { ACCENT_EVENT, cssVar } from '@/lib/accent';
import { nameCard } from '@/content/home';
import styles from './NameCard.module.css';

type Phase = 'hold' | 'crunch' | 'sharpen';

/**
 * Pixel name on Ink Blue. Loop: hold sharp → crunch up through the block steps →
 * swap word at the chunkiest step → sharpen back down → hold. Stepped on purpose (setTimeout, not rAF).
 */
export default function PixelName() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const { words, staticWord, blockSteps, holdMs, stepMs, font } = nameCard;
    const steps = [...blockSteps].sort((a, b) => a - b);
    const last = steps.length - 1;
    const reduced = prefersReducedMotion();
    const st = { word: 0, step: 0, phase: 'hold' as Phase, timer: 0 as ReturnType<typeof setTimeout> | 0, running: false };

    const draw = () =>
      renderPixelText(canvas, {
        text: reduced ? staticWord : words[st.word % words.length],
        block: reduced ? steps[0] : steps[Math.min(st.step, last)],
        fitW: 0.92,
        color: cssVar('--accent-on', '#FFFFFF'),
        font,
        measureEl: wrap,
      });

    const schedule = (ms: number, phase: Phase) => {
      clearTimeout(st.timer);
      st.phase = phase;
      st.timer = setTimeout(tick, ms);
    };

    const tick = () => {
      if (!st.running) return;
      if (st.phase === 'crunch') {
        if (st.step < last) {
          st.step += 1;
          draw();
          schedule(stepMs, 'crunch');
        } else {
          st.word = (st.word + 1) % words.length;
          draw();
          if (last > 0) schedule(stepMs, 'sharpen');
          else schedule(holdMs, 'crunch');
        }
      } else if (st.phase === 'sharpen') {
        if (st.step > 0) st.step -= 1;
        draw();
        if (st.step === 0) schedule(holdMs, 'crunch');
        else schedule(stepMs, 'sharpen');
      }
    };

    const start = () => {
      if (reduced || st.running) return;
      st.running = true;
      // resume from the same phase/step
      if (st.phase === 'hold') schedule(holdMs, 'crunch');
      else schedule(stepMs, st.phase);
    };
    const stop = () => {
      st.running = false;
      clearTimeout(st.timer);
    };
    const onVis = () => (document.hidden ? stop() : start());

    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener(ACCENT_EVENT, draw); // text colour follows the accent
    document.fonts?.ready.then(draw);
    draw();
    if (!document.hidden) start();

    return () => {
      stop();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener(ACCENT_EVENT, draw);
    };
  }, []);

  return (
    <div ref={wrapRef} className={styles.canvasWrap}>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={nameCard.ariaLabel} />
    </div>
  );
}
