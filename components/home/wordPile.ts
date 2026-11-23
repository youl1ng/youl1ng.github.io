import type Matter from 'matter-js';

// The hero's pile of hammered-off words: each word is a DOM element driven by a matter-js rigid body
// (its own rectangular collision box), so they tumble, collide and stack at the bottom of the card.
// Words can be grabbed and thrown. The box is open at the top: a word thrown out of it pops like a
// bubble right where it leaves the card: it shrinks a little (anticipation), bulges out, holds at
// its biggest for a beat, then bursts like a balloon: it tears into shards that fly off spinning (and
// knock its neighbours about).
// Double-clicking (or double-tapping) a word pops it on the spot.
// matter-js is loaded on demand (the first time the word is hovered), not with the page.

type M = typeof Matter;

const STEP = 1000 / 60; // fixed physics step (ms): same feel at 60 and 120 Hz
const WALL = 200; // wall thickness (px), thick enough that nothing tunnels through
const SETTLE_AGE = 700; // ms: a word has to have been falling this long before it counts as resting
const TRIM_PAUSE = 700; // ms after a word pops for room (or is let go) before another may: let things land
const GRAB = { stiffness: 0.18, damping: 0.08 }; // the spring between the pointer and a held word
// the pop, in ms: shrink (anticipation) -> bulge out (with a wobble) -> hold at the biggest -> burst
const POP = { shrink: 110, bulge: 170, hold: 90 };
const POP_MS = POP.shrink + POP.bulge + POP.hold;
const SCALE_MAX = { x: 1.34, y: 1.31 }; // how big it gets before it bursts
const LINES = 8; // comic "pop" lines
const DOUBLE_MS = 320; // a second press within this long (and close by) on the same word pops it

type Item = {
  el: HTMLElement;
  body: Matter.Body;
  w: number;
  h: number;
  born: number;
};

export type Kick = { vx: number; vy: number; spin: number };

type Opts = {
  /** y (in box px) the pile must stay under (the bottom of the sentence) */
  ceiling: () => number;
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
  private sky: HTMLDivElement; // full-window layer: words thrown out of the card pop over the page
  private held: { item: Item; c: Matter.Constraint; id: number } | null = null;
  private lastPress: { item: Item; t: number; x: number; y: number } | null = null;

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
    const item: Item = { el, body, w, h, born: performance.now() };
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
    if (this.held || e.button !== 0) return;
    e.preventDefault(); // no text selection / native drag
    // the second press of a double-click/tap: pop it (own timing rather than dblclick, which touch lacks)
    const now = performance.now();
    const lp = this.lastPress;
    if (lp && lp.item === item && now - lp.t < DOUBLE_MS && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) < 24) {
      this.lastPress = null;
      this.popOut(item);
      this.wake(); // the words it was holding up drop into the gap
      return;
    }
    this.lastPress = { item, t: now, x: e.clientX, y: e.clientY };
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

  /** wake every word (mid-tick: the tick sees them awake and keeps going) */
  private rouse() {
    for (const it of this.items) this.M.Sleeping.set(it.body, false);
  }

  private wake() {
    this.rouse();
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
    const busy = !!this.held || this.items.some((it) => !it.body.isSleeping || now - it.born < SETTLE_AGE + 200);
    if (busy) this.raf = requestAnimationFrame(this.tick);
  };

  /** A word (not held) whose middle has left the box is out: it pops. */
  private escape() {
    const W = this.box.clientWidth;
    const H = this.box.clientHeight;
    for (const it of [...this.items]) {
      if (this.held?.item === it) continue;
      const { x, y } = it.body.position;
      if (y < 0 || x < 0 || x > W || y > H) this.popOut(it);
    }
  }

  /** Pop a word; if that was the last one, the pile is empty (once it has burst). */
  private popOut(it: Item) {
    this.pop(it);
    window.setTimeout(() => {
      if (this.sky.isConnected && this.items.length === 0) this.opts.onEmpty();
    }, POP_MS);
  }

  /**
   * Pop like a bubble. The word leaves the physics and freezes where it is, then:
   * anticipation (squashes a little smaller), bulge (grows past full size, wobbling), hold (a beat at
   * its biggest), burst (it tears into shards, see burst(); nearby words get shoved).
   */
  private pop(it: Item) {
    const { el, body, w, h } = it;
    this.M.Composite.remove(this.engine.world, body);
    this.items = this.items.filter((o) => o !== it);
    // over the page now (it may be outside the card, which can clip it): same spot, in the window layer
    const br = this.box.getBoundingClientRect();
    const sr = this.sky.getBoundingClientRect();
    const cx = body.position.x + br.left - sr.left;
    const cy = body.position.y + br.top - sr.top;
    const angle = body.angle;
    const base = `translate3d(${(cx - w / 2).toFixed(2)}px, ${(cy - h / 2).toFixed(2)}px, 0) rotate(${angle.toFixed(4)}rad)`;
    el.dataset.popping = ''; // (not grabbable any more)
    el.style.transform = base;
    this.sky.append(el);
    const ink = getComputedStyle(el).color; // its text colour (pop lines)
    const big = `scale(${SCALE_MAX.x}, ${SCALE_MAX.y})`;
    const t = (ms: number) => ms / POP_MS;
    el.animate(
      [
        { transform: `${base} scale(1)`, easing: 'cubic-bezier(0.4, 0, 0.6, 1)' },
        // anticipation: draws in, a touch flatter
        { transform: `${base} scale(0.84, 0.8)`, offset: t(POP.shrink), easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.25)' },
        // bulge: out past full size, wobbling between wide and tall before it settles at its biggest
        { transform: `${base} scale(1.38, 1.22)`, offset: t(POP.shrink + POP.bulge * 0.55) },
        { transform: `${base} scale(1.27, 1.36)`, offset: t(POP.shrink + POP.bulge * 0.8) },
        { transform: `${base} ${big}`, offset: t(POP.shrink + POP.bulge) },
        // hold: frozen at its biggest, stretched tight
        { transform: `${base} ${big}` },
      ],
      { duration: POP_MS, fill: 'forwards' },
    );
    window.setTimeout(() => {
      if (this.sky.isConnected) {
        this.burst(el, base, cx, cy, w, h, angle, ink);
        this.shove(body.position.x, body.position.y, w);
      }
      el.remove(); // the whole word is gone in an instant: only its pieces are left
    }, POP_MS);
  }

  /**
   * The burst: like a balloon, the word tears into pieces. Its box (at its biggest) is cut into jagged
   * shards that tile it exactly; each shard is a copy of the word clipped to that shard (so the text
   * breaks too), and they fly out from the middle, spinning, then fall away. Pop lines flick out too.
   */
  private burst(el: HTMLElement, base: string, cx: number, cy: number, w: number, h: number, angle: number, ink: string) {
    const parts: HTMLElement[] = [];
    const S = SCALE_MAX;
    // a grid of points over the box, the inner ones nudged about, so the shards are irregular
    const cols = Math.min(7, Math.max(2, Math.round((w * S.x) / 24)));
    const rows = 2;
    const pts: [number, number][][] = [];
    for (let i = 0; i <= cols; i++) {
      pts.push([]);
      for (let j = 0; j <= rows; j++) {
        const jx = i > 0 && i < cols ? (Math.random() - 0.5) * (70 / cols) : 0;
        const jy = j > 0 && j < rows ? (Math.random() - 0.5) * 40 : 0;
        pts[i].push([(i / cols) * 100 + jx, (j / rows) * 100 + jy]);
      }
    }
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const shard = (poly: [number, number][]) => {
      // shard centre, in px from the word's centre (unscaled, unrotated)
      const px = (poly.reduce((s, p) => s + p[0], 0) / poly.length / 100 - 0.5) * w;
      const py = (poly.reduce((s, p) => s + p[1], 0) / poly.length / 100 - 0.5) * h;
      // which way it flies, on screen: out from the middle, plus a little chaos
      const lx = px * S.x;
      const ly = py * S.y;
      let ux = lx * cos - ly * sin;
      let uy = lx * sin + ly * cos;
      const n = Math.hypot(ux, uy) || 1;
      ux = ux / n + (Math.random() - 0.5) * 0.5;
      uy = uy / n + (Math.random() - 0.5) * 0.5 - 0.35; // a balloon's bits go up and out first
      const dist = 34 + Math.random() * 46;
      const spin = (Math.random() < 0.5 ? -1 : 1) * (160 + Math.random() * 360);
      const piece = el.cloneNode(true) as HTMLElement;
      delete piece.dataset.cursor;
      delete piece.dataset.cursorMode;
      piece.style.clipPath = `polygon(${poly.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(', ')})`;
      this.sky.append(piece);
      parts.push(piece);
      // in the word's own frame: turn and shrink about the shard's own centre
      const tf = (tx: number, ty: number, r: number, k: number) =>
        `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) ${base} scale(${S.x}, ${S.y}) ` +
        `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) rotate(${r.toFixed(0)}deg) scale(${k}) translate(${(-px).toFixed(1)}px, ${(-py).toFixed(1)}px)`;
      piece.animate(
        [
          { transform: tf(0, 0, 0, 1), opacity: 1 },
          { transform: tf(ux * dist * 0.75, uy * dist * 0.75, spin * 0.45, 0.92), opacity: 1, offset: 0.3 },
          { transform: tf(ux * dist, uy * dist + 60, spin, 0.45), opacity: 0 },
        ],
        { duration: 620 + Math.random() * 260, easing: 'cubic-bezier(0.12, 0.75, 0.35, 1)', fill: 'forwards' },
      );
    };
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const a = pts[i][j];
        const b = pts[i + 1][j];
        const c = pts[i + 1][j + 1];
        const d = pts[i][j + 1];
        // each cell splits into two triangles along a random diagonal: sharper, tearier pieces
        if (Math.random() < 0.5) {
          shard([a, b, c]);
          shard([a, c, d]);
        } else {
          shard([a, b, d]);
          shard([b, c, d]);
        }
      }
    }
    // pop lines: short comic strokes flicking out from just outside the edge, in the word's ink
    const W = w * S.x;
    const H = h * S.y;
    for (let k = 0; k < LINES; k++) {
      const a = (k / LINES) * Math.PI * 2 + Math.PI / LINES + (Math.random() - 0.5) * 0.3;
      const len = 7 + Math.random() * 5;
      const r0 = Math.hypot((Math.cos(a) * W) / 2, (Math.sin(a) * H) / 2) + 4;
      const r1 = r0 + 16 + Math.random() * 10;
      const line = document.createElement('span');
      line.style.cssText =
        `position:absolute;pointer-events:none;left:${cx - len / 2}px;top:${cy - 1.25}px;` +
        `width:${len}px;height:2.5px;border-radius:2px;background:${ink}`;
      this.sky.append(line);
      parts.push(line);
      const at = (r: number) => `translate(${(Math.cos(a) * r).toFixed(1)}px, ${(Math.sin(a) * r).toFixed(1)}px) rotate(${a}rad)`;
      line.animate(
        [
          { transform: `${at(r0)} scaleX(0.4)`, opacity: 1 },
          { transform: `${at((r0 + r1) / 2)} scaleX(1.25)`, opacity: 1, offset: 0.45 },
          { transform: `${at(r1)} scaleX(0.2)`, opacity: 0 },
        ],
        { duration: 300, easing: 'cubic-bezier(0.15, 0.8, 0.3, 1)', fill: 'forwards' },
      );
    }
    window.setTimeout(() => parts.forEach((p) => p.remove()), 950);
  }

  /** The pop's shockwave: words near it (box coords x, y) get knocked away from it. */
  private shove(x: number, y: number, w: number) {
    const R = w / 2 + 90;
    let hit = false;
    for (const it of this.items) {
      if (this.held?.item === it) continue;
      const dx = it.body.position.x - x;
      const dy = it.body.position.y - y;
      const d = Math.hypot(dx, dy);
      if (d > R) continue;
      const f = (1 - d / R) * 7;
      const ux = d ? dx / d : 0;
      const uy = d ? dy / d : -1;
      this.M.Body.setVelocity(it.body, { x: it.body.velocity.x + ux * f, y: it.body.velocity.y + uy * f - f * 0.35 });
      this.M.Body.setAngularVelocity(it.body, it.body.angularVelocity + (Math.random() - 0.5) * 0.08 * (f / 7));
      hit = true;
    }
    if (hit) this.wake();
  }

  private paint() {
    for (const it of this.items) {
      const { x, y } = it.body.position;
      it.el.style.transform = `translate3d(${(x - it.w / 2).toFixed(2)}px, ${(y - it.h / 2).toFixed(2)}px, 0) rotate(${it.body.angle.toFixed(4)}rad)`;
    }
  }

  /** Keep the pile under the sentence: if a resting word pokes above it, the oldest word pops. */
  private trim(now: number) {
    if (this.held || now < this.quietUntil) return; // one at a time
    const top = this.opts.ceiling();
    const poking = this.items.some(
      (it) => now - it.born > SETTLE_AGE && it.body.speed < 0.25 && it.body.bounds.min.y < top && it.body.bounds.max.y > 0,
    );
    if (!poking) return;
    this.popOut(this.items[0]);
    this.quietUntil = now + POP_MS + TRIM_PAUSE;
    this.rouse(); // the words it was holding up drop into the gap
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
