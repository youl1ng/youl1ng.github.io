'use client';

import { useEffect, useRef } from 'react';
import { Hammer, Hand, HandGrab } from 'lucide-react';
import styles from './CustomCursor.module.css';

// Anything you can click, plus anything marked data-cursor (e.g. goal stickers): the overlay morphs to cover it.
const LINK_SELECTOR = 'a, button, [role="button"], [data-cursor], label, select, summary';
const ACTIVE_CLASS = 'has-custom-cursor';

/* ───────── Tweakables ───────── */
const PAD = 7; // how far the overlay extends past the target's edges (px)
const FOLLOW = 0.05; // once morphed, the overlay follows mouse movement by this share…
const FOLLOW_MAX = 3; // …capped at this many px from centre
const LABEL_DOT = 10; // data-cursor-label zones (e.g. "View project"): circle shrinks to this, text beside it
const LABEL_GAP = 13; // label text starts this far from the pointer (dot radius + 8px)
const LABEL_EDGE = 12; // flip the label to the left when it would come closer than this to the right edge
const LABEL_ANCHOR_GAP = 2; // above/below labels: default gap from the target's overlay edge
// Over text the circle becomes a text-cursor bar, sized from the line under it:
const BAR_H_RATIO = 0.82; // height = this share of the line height…
const BAR_H_MIN = 12; // …clamped
const BAR_H_MAX = 36;
const BAR_W_RATIO = 0.1; // width = this share of the line height (thinner on small text)…
const BAR_W_MIN = 2; // …clamped
const BAR_W_MAX = 4;
const PRESS_FREE = 0.8; // pressed, free circle
const PRESS_TARGET = 0.96; // pressed, overlay

// Springs in Apple's terms: response (s) + damping ratio. Each value springs independently,
// so any morph can be interrupted mid-flight and re-targeted from wherever it is.
const MORPH = { response: 0.32, damping: 0.78 }; // overlay onto a target: a little overshoot = liquid
const SHAPE = { response: 0.2, damping: 0.86 }; // circle ⇄ bar ⇄ dot while glued to the pointer
const RELEASE_GAP = 0.05; // s: how fast the shape catches back up to the pointer after leaving a target
type SpringCfg = { response: number; damping: number };

/** A colour value from an attribute: a plain colour, or var(--x) resolved on the element itself. */
function resolveColor(t: Element, value: string): string {
  const m = value.match(/^var\((--[\w-]+)\)$/);
  return m ? getComputedStyle(t).getPropertyValue(m[1]).trim() : value;
}

/** Tint = data-cursor-color; '' = the default accent. */
function tintFor(t: Element): string {
  const attr = t.getAttribute('data-cursor-color');
  return attr ? resolveColor(t, attr) : '';
}

/** Height of the text line under the point, or 0 when the point isn't over a real text node's glyph box. */
function textLineAt(x: number, y: number): number {
  type CaretDoc = Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const d = document as CaretDoc;
  const node = d.caretPositionFromPoint
    ? d.caretPositionFromPoint(x, y)?.offsetNode
    : d.caretRangeFromPoint?.(x, y)?.startContainer;
  if (!node || node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) return 0;
  const range = document.createRange();
  range.selectNodeContents(node);
  for (const r of range.getClientRects()) {
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return r.height;
  }
  return 0;
}

class Spring {
  v = 0;
  constructor(public x: number) {}
  step(target: number, cfg: SpringCfg, dt: number) {
    const w = (2 * Math.PI) / cfg.response;
    const a = w * w * (target - this.x) - 2 * cfg.damping * w * this.v;
    this.v += a * dt;
    this.x += this.v * dt;
  }
  snap(target: number) {
    this.x = target;
    this.v = 0;
  }
  settled(target: number) {
    return Math.abs(target - this.x) < 0.05 && Math.abs(this.v) < 0.05;
  }
}

/**
 * Custom cursor for mouse/trackpad devices. Modes:
 *  - free: dark translucent circle locked 1:1 to the pointer
 *  - over text: flows into an Ink Blue text-cursor bar the height of the line
 *  - over something clickable: an Ink Blue overlay (or the target's data-cursor-color) flows over it,
 *    centred, and the pointer itself becomes a small Ink Blue dot
 *  - in a data-cursor-label zone: small Ink Blue dot with the label text beside it
 *    (except inside data-cursor-select islands, which act like plain selectable text)
 *  - a clickable with data-cursor-label (e.g. the GitHub key) gets the overlay, the dot and the label
 *  - the label sits right of the pointer, or left of it near the right edge of the window
 *  - data-cursor-mode="hammer" | "grab" (the hero's word / its fallen words): the cursor simply becomes
 *    that icon (lucide). The hammer strikes while pressed; the open hand closes while pressed.
 */
export default function CustomCursor() {
  const elRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    const dot = dotRef.current;
    if (!el || !dot || !window.matchMedia('(pointer: fine)').matches) return;

    const root = document.documentElement;
    root.classList.add(ACTIVE_CLASS);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const size = parseFloat(getComputedStyle(root).getPropertyValue('--cursor-size')) || 26;
    const label = labelRef.current;
    const icon = iconRef.current;
    const labelText = label?.firstElementChild as HTMLElement | null;
    let labelW = 0; // measured width of the current label text
    let labelGap = LABEL_ANCHOR_GAP; // distance of an anchored (above/below) label from the overlay

    // pointer
    let px = -100;
    let py = -100;
    let down = false;
    let target: Element | null = null;
    let isLabel = false; // target is a label zone (data-cursor-label on something not clickable)
    let isIcon = false; // target is data-cursor-mode="hammer" | "grab": the shape hides, the icon shows
    let lineH = 0; // > 0 while over text (free mode only)
    let entryX = 0; // pointer position when the current target was entered:
    let entryY = 0; // the overlay starts centred, and only mouse movement since then shifts it
    let releasing = false; // overlay flowing back into the pointer after leaving a target

    // shape (centre x/y, width, height, radius)
    const cx = new Spring(px);
    const cy = new Spring(py);
    const w = new Spring(size);
    const h = new Spring(size);
    const r = new Spring(size / 2);
    const springs = [cx, cy, w, h, r];
    const sizeSprings = [w, h, r];

    let raf = 0;
    let last = 0;

    // Where position:fixed's 0,0 actually is. With scrollbar-gutter: stable both-edges (globals.css,
    // ≥1270px) and classic scrollbars, fixed boxes start after the left gutter, while pointer
    // coordinates start at the window edge: without this the cursor sits ~15px right of the pointer.
    let ox = 0;
    let oy = 0;
    const measureOrigin = () => {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none';
      document.body.append(probe);
      const b = probe.getBoundingClientRect();
      ox = b.left;
      oy = b.top;
      probe.remove();
    };
    measureOrigin();

    const goal = (): number[] => {
      if (target && isIcon) return [px, py, 0, 0, 0]; // (hidden under the icon)
      if (target && isLabel) {
        const d = LABEL_DOT * (down ? PRESS_FREE : 1);
        return [px, py, d, d, d / 2];
      }
      if (target && target.isConnected) {
        const b = target.getBoundingClientRect();
        const press = down ? PRESS_TARGET : 1;
        const tw = (b.width + PAD * 2) * press;
        const th = (b.height + PAD * 2) * press;
        const follow = (d: number) => Math.max(-FOLLOW_MAX, Math.min(FOLLOW_MAX, d * FOLLOW));
        const rad = parseFloat(getComputedStyle(target).borderTopLeftRadius) || 0;
        return [
          b.left + b.width / 2 + follow(px - entryX),
          b.top + b.height / 2 + follow(py - entryY),
          tw,
          th,
          Math.min(rad + PAD, Math.min(tw, th) / 2),
        ];
      }
      if (lineH) {
        const bh = Math.max(BAR_H_MIN, Math.min(BAR_H_MAX, lineH * BAR_H_RATIO)) * (down ? 0.9 : 1);
        const bw = Math.max(BAR_W_MIN, Math.min(BAR_W_MAX, lineH * BAR_W_RATIO));
        return [px, py, bw, bh, bw / 2];
      }
      const d = size * (down ? PRESS_FREE : 1);
      return [px, py, d, d, d / 2];
    };

    const paint = () => {
      el.style.width = `${w.x.toFixed(2)}px`;
      el.style.height = `${h.x.toFixed(2)}px`;
      el.style.borderRadius = `${Math.max(0, r.x).toFixed(2)}px`;
      el.style.transform = `translate3d(${(cx.x - w.x / 2 - ox).toFixed(2)}px, ${(cy.x - h.x / 2 - oy).toFixed(2)}px, 0)`;
      dot.style.transform = `translate3d(${px - ox}px, ${py - oy}px, 0)`;
      if (icon) icon.style.transform = `translate3d(${px - ox}px, ${py - oy}px, 0)`;
      if (label && 'on' in label.dataset && label.dataset.anchor && target) {
        // centred over/under the target (and its overlay), kept inside the window
        const b = target.getBoundingClientRect();
        const half = labelW / 2;
        const x = Math.max(LABEL_EDGE + half, Math.min(window.innerWidth - LABEL_EDGE - half, b.left + b.width / 2));
        const y = label.dataset.anchor === 'above' ? b.top - PAD - labelGap : b.bottom + PAD + labelGap;
        label.style.transform = `translate3d(${x - ox}px, ${y - oy}px, 0)`;
        delete label.dataset.flip;
      } else if (label && 'on' in label.dataset) {
        // label beside the pointer; flips to the left when it would run off the right edge
        const flip = px + LABEL_GAP + labelW + LABEL_EDGE > window.innerWidth;
        label.style.transform = `translate3d(${(flip ? px - LABEL_GAP : px + LABEL_GAP) - ox}px, ${py - oy}px, 0)`;
        if (flip) label.dataset.flip = '';
        else delete label.dataset.flip;
      }
    };

    const tick = (now: number) => {
      raf = 0;
      const g = goal();
      if (reduced) {
        springs.forEach((s, i) => s.snap(g[i]));
        releasing = false;
        paint();
        return;
      }
      let dt = last ? (now - last) / 1000 : 1 / 60;
      last = now;
      dt = Math.min(dt, 1 / 30);
      const n = Math.ceil(dt / (1 / 240)); // sub-step for stability
      const stepSize = (cfg: SpringCfg) => {
        for (let k = 0; k < n; k++) sizeSprings.forEach((s, i) => s.step(g[i + 2], cfg, dt / n));
      };

      if (target && !isLabel) {
        // overlay flows onto the target
        for (let k = 0; k < n; k++) springs.forEach((s, i) => s.step(g[i], MORPH, dt / n));
      } else if (releasing) {
        // leaving a target: the gap to the pointer decays (can't lag behind a moving mouse)
        const decay = Math.exp(-dt / RELEASE_GAP);
        cx.snap(g[0] + (cx.x - g[0]) * decay);
        cy.snap(g[1] + (cy.x - g[1]) * decay);
        stepSize(SHAPE);
        if (Math.abs(cx.x - g[0]) < 1 && Math.abs(cy.x - g[1]) < 1) releasing = false;
      } else {
        // glued to the pointer (circle, bar or label dot); only the shape flows
        cx.snap(g[0]);
        cy.snap(g[1]);
        stepSize(SHAPE);
      }
      paint();

      const busy = (target && !isLabel) || releasing || !sizeSprings.every((s, i) => s.settled(g[i + 2]));
      if (busy) wake(); // overlays keep running: the target can move (keycaps lift, rows change)
      else {
        sizeSprings.forEach((s, i) => s.snap(g[i + 2]));
        last = 0;
      }
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const setTarget = (t: Element | null) => {
      if (t === target) return;
      // "a|b|c" = a set of lines; one is picked at random each time the target is entered
      const lines = (t?.getAttribute('data-cursor-label') || '').split('|').filter(Boolean);
      const text = lines.length ? lines[Math.floor(Math.random() * lines.length)] : '';
      // dot mode: a label zone (data-cursor-label on something not clickable), or a clickable marked
      // data-cursor-mode="dot" (e.g. nav links, whose own underline is the hover feedback: no overlay)
      const dotOnly = t?.getAttribute('data-cursor-mode') === 'dot';
      const mode = t?.getAttribute('data-cursor-mode');
      const iconMode = mode === 'hammer' || mode === 'grab' ? mode : null;
      const zone = !!t && (dotOnly || !!iconMode || (!!text && !t.matches(LINK_SELECTOR)));
      const wasZone = isLabel;
      delete el.dataset.morph;
      delete el.dataset.label;
      delete el.dataset.icon;
      delete dot.dataset.on;
      isLabel = false;
      isIcon = !!iconMode;
      if (icon) {
        if (iconMode) {
          icon.dataset.icon = iconMode;
          el.dataset.icon = '';
        } else delete icon.dataset.icon;
      }
      // label text beside the pointer, for zones and for clickables that carry one
      if (label && labelText) {
        if (text) {
          labelText.textContent = text;
          labelW = labelText.offsetWidth;
          label.dataset.on = '';
          // data-cursor-label-style="above" | "below": the text sits centred over/under the target
          // (e.g. under the GitHub key, over a marquee tag) instead of beside the pointer, so it never
          // covers the thing itself. data-cursor-label-gap (px) sets the distance from the overlay edge.
          const anchor = t?.getAttribute('data-cursor-label-style');
          if (anchor === 'above' || anchor === 'below') label.dataset.anchor = anchor;
          else delete label.dataset.anchor;
          labelGap = Number(t?.getAttribute('data-cursor-label-gap')) || LABEL_ANCHOR_GAP;
          // data-cursor-label-variant: a different look for the label (e.g. "hazard": under-construction pill)
          const variant = t?.getAttribute('data-cursor-label-variant');
          if (variant) label.dataset.variant = variant;
          else delete label.dataset.variant;
          labelW = labelText.offsetWidth; // re-measure: a variant can add padding / a border
          // data-cursor-label-color: the text in the target's own colour (var(--x) resolved on it)
          const col = t?.getAttribute('data-cursor-label-color');
          if (col && t) labelText.style.setProperty('--label-color', resolveColor(t, col));
          else labelText.style.removeProperty('--label-color');
        } else delete label.dataset.on;
      }
      if (zone) {
        isLabel = true;
        el.dataset.label = '';
        if (target && !wasZone) releasing = true;
      } else if (t) {
        entryX = px;
        entryY = py;
        el.style.setProperty('--tint', tintFor(t));
        el.dataset.morph = '';
        dot.dataset.on = '';
      } else if (target) {
        releasing = !wasZone;
      }
      target = t;
      wake();
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      px = e.clientX;
      py = e.clientY;
      if (!('visible' in el.dataset)) el.dataset.visible = '';
      // nearest of: a clickable / data-cursor element (overlay), a data-cursor-label zone (dot + label),
      // or a data-cursor-select island (plain selectable text inside a label zone: behaves like free space)
      const hit = (e.target as Element | null)?.closest?.(`${LINK_SELECTOR}, [data-cursor-label], [data-cursor-select]`);
      // (hidden targets, e.g. the copy icon on narrow cards, don't count)
      const visible = hit && hit.getBoundingClientRect().width > 0;
      // data-cursor-mode="none" (e.g. nav links, whose underline is the hover feedback): plain circle
      const plain = !!hit && hit.getAttribute('data-cursor-mode') === 'none';
      setTarget(visible && !plain && !hit.hasAttribute('data-cursor-select') ? hit : null);
      // over text (and nothing clickable): become a text-cursor bar
      lineH = target || plain ? 0 : textLineAt(px, py);
      if (lineH) el.dataset.text = '';
      else delete el.dataset.text;
      wake();
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      down = true;
      icon?.setAttribute('data-down', ''); // hammer strikes / hand closes
      wake();
    };
    const onUp = () => {
      down = false;
      icon?.removeAttribute('data-down');
      wake();
    };
    // Leaving the window hides it (no stuck shape at the edge).
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) {
        delete el.dataset.visible;
        delete el.dataset.text;
        lineH = 0;
        setTarget(null);
      }
    };

    const onResize = () => {
      measureOrigin(); // the gutter comes and goes at 1270px
      paint();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointerout', onOut, { passive: true });
    paint();

    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove(ACTIVE_CLASS);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerout', onOut);
    };
  }, []);

  return (
    <>
      <div ref={elRef} className={styles.cursor} aria-hidden="true" />
      <div ref={dotRef} className={styles.dot} aria-hidden="true" />
      <div ref={labelRef} className={styles.label} aria-hidden="true">
        <span className={styles.text} />
      </div>
      {/* icon cursors (data-cursor-mode="hammer" | "grab"); CSS shows the one matching data-icon */}
      <div ref={iconRef} className={styles.icon} aria-hidden="true">
        <Hammer className={styles.hammer} size={28} strokeWidth={2.25} />
        <Hand className={styles.hand} size={26} strokeWidth={2.25} />
        <HandGrab className={styles.grab} size={26} strokeWidth={2.25} />
      </div>
    </>
  );
}
