import type Matter from 'matter-js';

// The hero's pile of hammered-off words: each word is a DOM element driven by a matter-js rigid body
// (its own rectangular collision box), so they tumble, collide and stack at the bottom of the card.
// Words can be grabbed and thrown. The box is open at the top: a word thrown out of it leaves the
// card, flies over the page (no more collisions) and falls off the screen.
// matter-js is loaded on demand (the first time the word is hovered), not with the page.

type M = typeof Matter;

const STEP = 1000 / 60; // fixed physics step (ms): same feel at 60 and 120 Hz
const WALL = 200; // wall thickness (px), thick enough that nothing tunnels through
const SETTLE_AGE = 700; // ms: a word has to have been falling this long before it counts as resting
const LEAVE_MS = 260; // fade-out when the pile gets too tall (matches .leaving in Hero.module.css)
const TRIM_PAUSE = 700; // ms after a word leaves (or is let go) before another may: let things land
const GRAB = { stiffness: 0.18, damping: 0.08 }; // the spring between the pointer and a held word

type Item = {
  el: HTMLElement;
  body: Matter.Body;
  w: number;
  h: number;
  born: number;
  leaving: boolean;
  flying: boolean; // thrown out of the box: drawn over the page, no collisions
};

export type Kick = { vx: number; vy: number; spin: number };

type Opts = {
  /** y (in box px) the pile must stay under (the bottom of the sentence) */
  ceiling: () => number;
  /** class that fades a word out */
  leavingClass: string;
  /** the last word was thrown out: the pile is empty */
  onEmpty: () => void;
};

export class WordPile {
  private engine: Matter.Engine;
  private walls: Matter.Body[] = [];
  private items: Item[] = [];
  private raf = 0;
  private last = 0;
  private acc = 0;
  private ro: ResizeObserver;
  private quietUntil = 0;
  private sky: HTMLDivElement; // full-window layer for words thrown out of the card
  private held: { item: Item; c: Matter.Constraint; id: number } | null = null;

  private constructor(
    private M: M,
    private box: HTMLElement,
    private opts: Opts,
  ) {
    this.engine = M.Engine.create({ enableSleeping: true, positionIterations: 10, velocityIterations: 8 });
    this.engine.gravity.y = 1.1;
    this.sky = document.createElement('div');
    this.sky.className = box.className; // same type styles as the pile
    this.sky.setAttribute('aria-hidden', 'true');
    this.sky.style.cssText = 'position:fixed;inset:0;z-index:2147482000;pointer-events:none;overflow:visible';
    document.body.append(this.sky);
    this.setBounds();
    this.ro = new ResizeObserver(() => {
      this.setBounds();
      this.wake();
    });
    this.ro.observe(box);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
  }

  static async create(box: HTMLElement, opts: Opts) {
    const mod = await import('matter-js');
    const M = ((mod as unknown as { default?: M }).default ?? mod) as M;
    return new WordPile(M, box, opts);
  }

  /** Floor + two walls, exactly the card's height: the top is open, so words can be thrown out. */
  private setBounds() {
    const { Bodies, Composite, Body } = this.M;
    const W = this.box.clientWidth;
    const H = this.box.clientHeight;
    Composite.remove(this.engine.world, this.walls);
    const opts = { isStatic: true, friction: 0.8 };
    this.walls = [
      Bodies.rectangle(W / 2, H + WALL / 2, W + WALL * 2, WALL, opts),
      Bodies.rectangle(-WALL / 2, H / 2, WALL, H, opts),
      Bodies.rectangle(W + WALL / 2, H / 2, WALL, H, opts),
    ];
    Composite.add(this.engine.world, this.walls);
    // a narrower card: pull words that are now outside back in
    for (const it of this.items) {
      if (it.flying) continue;
      const x = Math.min(Math.max(it.body.position.x, it.w / 2), Math.max(it.w / 2, W - it.w / 2));
      const y = Math.min(it.body.position.y, H - it.h / 2);
      if (x !== it.body.position.x || y !== it.body.position.y) Body.setPosition(it.body, { x, y });
    }
  }

  /** Drop `el` (already in the box, w×h, top-left at x,y) into the pile with a hammer kick. */
  add(el: HTMLElement, x: number, y: number, w: number, h: number, kick: Kick) {
    const { Bodies, Body, Composite } = this.M;
    const body = Bodies.rectangle(x + w / 2, y + h / 2, w, h, {
      chamfer: { radius: Math.min(6, h * 0.18) },
      friction: 0.35, // slippery enough to slide off a peak instead of towering
      frictionStatic: 0.6,
      restitution: 0.18,
      density: 0.0015,
    });
    Body.setVelocity(body, { x: kick.vx, y: kick.vy });
    Body.setAngularVelocity(body, kick.spin);
    Composite.add(this.engine.world, body);
    const item: Item = { el, body, w, h, born: performance.now(), leaving: false, flying: false };
    this.items.push(item);
    el.addEventListener('pointerdown', (e) => this.grab(item, e));
    this.paint();
    this.wake();
  }

  /* ── grabbing: a spring from the pointer to the point of the word you took hold of ── */

  /** pointer position in box coordinates */
  private local(e: PointerEvent) {
    const r = this.box.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private grab(item: Item, e: PointerEvent) {
    if (this.held || item.leaving || item.flying || e.button !== 0) return;
    e.preventDefault(); // no text selection / native drag
    try {
      item.el.setPointerCapture(e.pointerId); // keeps the hand cursor on it while it's dragged around
    } catch {
      /* pointer already gone: the window listeners still drive the drag */
    }
    const p = this.local(e);
    const { body } = item;
    const c = this.M.Constraint.create({
      pointA: p,
      bodyB: body,
      pointB: { x: p.x - body.position.x, y: p.y - body.position.y },
      length: 0,
      ...GRAB,
    });
    this.M.Composite.add(this.engine.world, c);
    this.held = { item, c, id: e.pointerId };
    item.el.dataset.held = '';
    this.wake();
  }

  private onMove = (e: PointerEvent) => {
    if (!this.held || e.pointerId !== this.held.id) return;
    this.held.c.pointA = this.local(e);
    this.wake();
  };

  private onUp = (e: PointerEvent) => {
    if (!this.held || e.pointerId !== this.held.id) return;
    const { item, c } = this.held;
    this.M.Composite.remove(this.engine.world, c); // let go: it keeps the velocity you gave it
    delete item.el.dataset.held;
    this.held = null;
    this.quietUntil = performance.now() + TRIM_PAUSE;
    this.wake();
  };

  /* ── simulation ── */

  private wake() {
    for (const it of this.items) this.M.Sleeping.set(it.body, false);
    if (!this.raf) {
      this.last = 0;
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  private tick = (now: number) => {
    this.raf = 0;
    const dt = this.last ? Math.min(now - this.last, 100) : STEP;
    this.last = now;
    this.acc += dt;
    while (this.acc >= STEP) {
      this.M.Engine.update(this.engine, STEP);
      this.acc -= STEP;
    }
    this.escape();
    this.paint();
    this.trim(now);
    // keep stepping while anything moves or is held, or a new word hasn't been checked yet
    const busy =
      !!this.held || this.items.some((it) => it.flying || !it.body.isSleeping || now - it.born < SETTLE_AGE + 200);
    if (busy) this.raf = requestAnimationFrame(this.tick);
  };

  /** A word (not held) that's left the box entirely is out: it flies over the page and falls away. */
  private escape() {
    const W = this.box.clientWidth;
    const H = this.box.clientHeight;
    for (const it of this.items) {
      if (it.flying || it.leaving || this.held?.item === it) continue;
      const b = it.body.bounds;
      if (b.max.y < 0 || b.max.x < 0 || b.min.x > W || b.min.y > H) {
        it.flying = true;
        it.body.collisionFilter = { group: 0, category: 0x0001, mask: 0 }; // nothing to hit any more
        it.el.dataset.flying = ''; // (not grabbable any more)
        this.sky.append(it.el);
        const left = this.items.filter((o) => !o.flying && !o.leaving);
        if (left.length === 0) this.opts.onEmpty();
      }
    }
    // gone off the bottom (or far side) of the window: done
    const br = this.box.getBoundingClientRect();
    for (const it of this.items.filter((o) => o.flying)) {
      const { x, y } = it.body.position;
      const sx = br.left + x;
      const sy = br.top + y;
      if (sy - it.h > window.innerHeight + 40 || sx < -400 || sx > window.innerWidth + 400) this.drop(it);
    }
  }

  private drop(it: Item) {
    this.M.Composite.remove(this.engine.world, it.body);
    it.el.remove();
    this.items = this.items.filter((o) => o !== it);
  }

  private paint() {
    const br = this.box.getBoundingClientRect();
    const sr = this.items.some((it) => it.flying) ? this.sky.getBoundingClientRect() : null;
    for (const it of this.items) {
      let { x, y } = it.body.position;
      if (it.flying && sr) {
        // same spot on screen, in the window-wide layer
        x += br.left - sr.left;
        y += br.top - sr.top;
      }
      it.el.style.transform = `translate3d(${(x - it.w / 2).toFixed(2)}px, ${(y - it.h / 2).toFixed(2)}px, 0) rotate(${it.body.angle.toFixed(4)}rad)`;
    }
  }

  /** Keep the pile under the sentence: if a resting word pokes above it, the oldest word leaves. */
  private trim(now: number) {
    if (this.held || now < this.quietUntil || this.items.some((it) => it.leaving)) return; // one at a time
    const top = this.opts.ceiling();
    const pile = this.items.filter((it) => !it.flying);
    const poking = pile.some(
      (it) => now - it.born > SETTLE_AGE && it.body.speed < 0.25 && it.body.bounds.min.y < top && it.body.bounds.max.y > 0,
    );
    if (!poking) return;
    const oldest = pile[0];
    oldest.leaving = true;
    oldest.el.classList.add(this.opts.leavingClass);
    this.quietUntil = now + LEAVE_MS + TRIM_PAUSE;
    window.setTimeout(() => {
      this.drop(oldest);
      this.wake(); // the words it was holding up drop into the gap
    }, LEAVE_MS);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    this.items.forEach((it) => it.el.remove());
    this.items = [];
    this.sky.remove();
    this.M.Engine.clear(this.engine);
  }
}
