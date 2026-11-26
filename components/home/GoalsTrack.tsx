'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Card from './Card';
import { CheckSmall } from '@/components/icons/Glyphs';
import { renderPixelText, prefersReducedMotion } from '@/lib/pixelText';
import { ACCENT_EVENT, cssVar } from '@/lib/accent';
import { goals, trackItems, nameCard, type GoalStatus } from '@/content/home';
import styles from './GoalsTrack.module.css';

/* ───────── Track geometry ───────── */
const PAD = 16;
// FINISH bar: one grid gap (12px) below the title pill (pill top 20 + 13 line).
const FINISH_TOP = 45;
const FINISH_H = 56; // 7 × 8px checker squares, no half squares
const LANE_TOP = FINISH_TOP + 28; // lanes start under the bar
const BEND_FROM_BOTTOM = 152;
const CX = -24; // curve centre just off the left edge, so the lanes run out of view
const BOX_TOP = FINISH_TOP + FINISH_H; // moving strip starts under the FINISH bar
const LEAD = 120; // item paths begin off-screen above the strip
const LAP = 480; // the strip repeats every 480px of travel
const FALLBACK = { W: 284, H: 680 };

/* ───────── Auto-run while hovered (px/s, seconds) ───────── */
// 2) Sprint start: settle back into the blocks, burst out, ease down to a cruise.
const CROUCH_T = 0.16; // drift backwards this long…
const CROUCH_V = -32; // …at this speed
const SPRINT_V = 170; // burst speed straight after the crouch
const SPRINT_DECAY = 0.38; // time constant of the burst easing down to cruise
const CRUISE_V = 66; // average running pace
// 1) Stride: speed pulses in bursts: ease up, hold the speed, ease off, then glide.
const STRIDE_HZ = 1.3; // bursts per second
const STRIDE_PUSH = 0.42; // share of each step spent in the burst (≈ 0.32s)
const STRIDE_MIN = 0.4; // glide speed as a share of cruise (the bursts make up the average)
const STRIDE_IN = [0.45, 1.3]; // stride blends in over this window after the start
const SPEED_FOLLOW = 14; // how tightly the actual speed follows the plan (per second)
// Leaving: coast on momentum, overshoot a touch, settle back.
const COAST_T = 0.4; // project momentum this many seconds ahead
const COAST = { response: 0.8, damping: 0.4 };
// 3) Lap tally: each lap is 400m. When the distance run reaches a milestone, the FINISH bar
//    pixel-crunches (like the name card) into swapped colours showing it ("+800"), holds, then crunches
//    back to blue "FINISH". Every milestone is shown, in order. After the last one the bar crunches into
//    "COMPLETED" and flashes for ~2s, then back to "FINISH" and the count starts over from 0.
//    It also starts over whenever the track comes to rest.
const LAP_METRES = 400;
const LAP_MILESTONES = [800, 1600, 2400, 3200, 4000]; // every 800m, up to 4000
const LAP_COMPLETE_TEXT = 'COMPLETED';
const LAP_STEPS = [1, 2, 3, 4, 5]; // FINISH pixel block sizes, sharp → crunched
const LAP_STEP_MS = 70;
const LAP_HOLD_MS = 700; // how long a milestone stays up
const LAP_HOLD_QUEUED_MS = 350; // …shorter when more milestones are waiting
const LAP_FINALE_FLASHES = 16; // "COMPLETED": colour flips (even, so it ends swapped)…
const LAP_FINALE_MS = 125; // …this far apart (16 × 125ms = 2s)

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// burst shape inside the push: ease up over the first quarter, hold, ease off over the last quarter
const burstShape = (u: number) => smoothstep(0, 0.25, u) * (1 - smoothstep(0.75, 1, u));
const BURST_MEAN = 0.75; // mean of burstShape over [0, 1]

/** Stride multiplier for a phase in [0, 1): flat-topped burst, then glide. Averages to 1. */
function stride(phase: number) {
  const push = phase < STRIDE_PUSH ? burstShape(phase / STRIDE_PUSH) : 0;
  return STRIDE_MIN + ((1 - STRIDE_MIN) / (STRIDE_PUSH * BURST_MEAN)) * push;
}

/** Planned running speed t seconds after the mouse entered the card. */
function runSpeed(t: number) {
  if (t < CROUCH_T) return CROUCH_V * Math.sin((Math.PI * t) / CROUCH_T); // ease back and forth into the blocks
  const tr = t - CROUCH_T;
  const base = CRUISE_V + (SPRINT_V - CRUISE_V) * Math.exp(-tr / SPRINT_DECAY);
  const mix = smoothstep(STRIDE_IN[0], STRIDE_IN[1], tr);
  return base * (1 - mix + mix * stride((tr * STRIDE_HZ) % 1));
}

function trackView(W: number, H: number) {
  const bendY = H - BEND_FROM_BOTTOM;
  const lw = (W - 2 * PAD) / 5;
  const lane = (x: number) => {
    const r = x - CX;
    return `M${x.toFixed(1)} ${LANE_TOP} L${x.toFixed(1)} ${bendY} A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${CX} ${(bendY + r).toFixed(1)}`;
  };
  const lanesD = Array.from({ length: 6 }, (_, i) => lane(PAD + i * lw)).join(' ');

  const mpath = (x: number) => {
    const r = x - CX;
    const yb = bendY - BOX_TOP;
    return `M${x.toFixed(1)} ${-LEAD} L${x.toFixed(1)} ${yb} A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${CX} ${(yb + r).toFixed(1)}`;
  };
  const pathLen = (x: number) => bendY - BOX_TOP + LEAD + ((x - CX) * Math.PI) / 2;

  const items: { key: string; kind: 'marker' | 'icon'; text: string; color?: string; path: string; base: string }[] = [];
  trackItems.forEach((it, n) => {
    const x = PAD + it.lane * lw;
    const path = mpath(x);
    const len = pathLen(x);
    // enough copies to cover the whole path for any offset in [0, LAP)
    for (let k = -1; k * LAP < len + LAP; k++) {
      items.push({
        key: `${n}-${k}`,
        kind: it.kind,
        text: it.text,
        color: 'color' in it ? it.color : undefined,
        path,
        base: (LEAD - LAP + it.d + k * LAP).toFixed(1),
      });
    }
  });
  return { viewBox: `0 0 ${W} ${H}`, lanesD, items };
}

/* ───────── Goals ───────── */
const ORDER: GoalStatus[] = ['upcoming', 'in progress', 'done'];
const TRAY: Record<GoalStatus, [string, string]> = {
  upcoming: ['var(--status-next)', 'var(--status-next-ink)'],
  'in progress': ['var(--status-now)', 'var(--status-now-ink)'],
  done: ['var(--status-done)', 'var(--status-done-ink)'],
};
const STICKER_W = 66; // % of card
const LANES = [2, 4]; // zig-zag
const AREA_TOP = BOX_TOP + 14; // stickers start 14px under the FINISH bar
const MIN_GAP = 8;
const MIN_SCALE = 0.72;

// Finish line first (furthest goals), done goals near the start. Capped at 6 (see HANDOFF §10).
const sorted = ORDER.flatMap((s) => goals.items.filter((g) => g.status === s)).slice(0, 6);

// goal dates are 'YYYY-MM-DD' (local midnight) or a full ISO time like '2027-03-21T07:30:00-04:00'
const dayOf = (iso: string) => iso.slice(0, 10);
const targetTime = (iso: string) => (iso.length > 10 ? new Date(iso) : new Date(`${iso}T00:00:00`)).getTime();

function dateLabel(iso: string) {
  return new Date(`${dayOf(iso)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysUntil(iso: string, today: Date) {
  return Math.round((new Date(`${dayOf(iso)}T00:00:00`).getTime() - today.getTime()) / 86400000);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Live countdown in a sticker's foot: "117d 14:32:05", ticking every second, "Race day" once it's on. */
function Countdown({ iso }: { iso: string }) {
  const [left, setLeft] = useState<number | null>(null); // client-only (avoids a hydration mismatch)
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, targetTime(iso) - Date.now()));
    tick();
    // line up with the wall clock's seconds so every tick lands on a whole second
    let id = 0;
    const t = window.setTimeout(() => {
      tick();
      id = window.setInterval(tick, 1000);
    }, 1000 - (Date.now() % 1000));
    return () => {
      window.clearTimeout(t);
      window.clearInterval(id);
    };
  }, [iso]);
  if (left === null) return null;
  if (left === 0) return <>Race day</>;
  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400);
  const clock = `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
  return (
    <span className={styles.countdown} role="timer" aria-label={`${d} ${d === 1 ? 'day' : 'days'} to go`}>
      {d > 0 && `${d}d `}
      {clock}
    </span>
  );
}

function placement(H: number, hs: number[]) {
  const areaBot = H - 20;
  const avail = Math.max(1, areaBot - AREA_TOP);
  const sum = hs.reduce((a, b) => a + b, 0);
  const need = sum + MIN_GAP * (hs.length - 1);
  const tight = need > avail;
  const sc = tight ? Math.max(MIN_SCALE, avail / need) : 1;
  const gap = tight ? MIN_GAP * sc : Math.min(48, (avail - sum) / hs.length);
  let y = AREA_TOP + (tight ? 0 : gap / 2);
  const tops = hs.map((h) => {
    const t = y;
    y += h * sc + gap;
    return t;
  });
  return { sc, tops };
}

export default function GoalsTrack() {
  const cardRef = useRef<HTMLElement>(null);
  const finishRef = useRef<HTMLCanvasElement>(null);
  const finishLook = useRef({ block: 1, inverted: false, text: 'FINISH' }); // current FINISH pixel size, colours, text
  const drawFinish = useRef<() => void>(() => {});
  const [size, setSize] = useState<{ W: number; H: number } | null>(null);
  const [hs, setHs] = useState<number[]>(() => sorted.map(() => 70));
  const [today, setToday] = useState<Date | null>(null); // client-only, avoids hydration mismatch

  // Measure card + sticker heights.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const measure = () => {
      const r = card.getBoundingClientRect();
      const W = Math.round(r.width);
      const H = Math.round(r.height);
      setSize((s) => (s && s.W === W && s.H === H ? s : { W, H }));
      const next = Array.from(card.querySelectorAll<HTMLElement>('[data-sticker]')).map((li) => li.offsetHeight);
      setHs((prev) => (prev.join(',') === next.join(',') ? prev : next));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(card);
    card.querySelectorAll('[data-sticker]').forEach((li) => ro.observe(li));
    document.fonts?.ready.then(measure);
    measure();
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setToday(d);
    return () => ro.disconnect();
  }, []);

  // FINISH text (or the lap tally): pixel renderer, block 1 at rest.
  useEffect(() => {
    const cv = finishRef.current;
    if (!cv) return;
    const draw = () => {
      // longer words ("COMPLETED") get a wider canvas so the letters stay the same height as FINISH
      const len = finishLook.current.text.length;
      const w = len > 6 ? `${Math.min(170, Math.round((96 * len) / 6))}px` : '';
      if (cv.style.width !== w) cv.style.width = w;
      renderPixelText(cv, {
        text: finishLook.current.text,
        block: finishLook.current.block,
        fitW: 0.98,
        // on the accent bar: the accent's text colour; on the swapped (white) bar: the accent ink
        color: finishLook.current.inverted ? cssVar('--accent-ink', '#4243D0') : cssVar('--accent-on', '#FFFFFF'),
        font: nameCard.font,
      });
    };
    drawFinish.current = draw;
    draw();
    document.fonts?.ready.then(draw);
    document.addEventListener(ACCENT_EVENT, draw);
    const ro = new ResizeObserver(draw);
    ro.observe(cv);
    return () => {
      ro.disconnect();
      document.removeEventListener(ACCENT_EVENT, draw);
    };
  }, []);

  // Markers run down the lanes: on their own while the mouse is over the card (easing in and out),
  // plus the wheel adds to it. Passive: never blocks page scroll. The track itself never moves.
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const reduced = prefersReducedMotion();
    const finish = finishRef.current?.parentElement;
    // Track offset = wheel part (glides to its target) + auto-run part (run → coast → idle).
    const d = { s: 0, target: 0, raf: 0, last: 0 };
    const run = { x: 0, v: 0, mode: 'idle' as 'idle' | 'run' | 'coast', t: 0, stopAt: 0 };
    let lapHigh = 0; // furthest whole lap reached

    // Lap tally on the FINISH bar. Every change is a stepped crunch like the name card:
    // crunch up → change at the chunkiest step → sharpen. One at a time; milestones reached
    // mid-animation wait their turn.
    const tallyMax = LAP_MILESTONES[LAP_MILESTONES.length - 1];
    let tally = 0; // metres run since the track last came to rest
    let nextMilestone = 0; // index into LAP_MILESTONES of the next one to show
    let busy = false;
    let pendingReset = false;
    let flashTimer = 0;
    const setBlock = (block: number) => {
      finishLook.current.block = block;
      finish?.style.setProperty('--chk', `${8 * (block + 1)}px`); // checker squares chunk up too
      drawFinish.current();
    };
    const setInverted = (on: boolean) => {
      finishLook.current.inverted = on;
      if (finish) {
        if (on) finish.dataset.inverted = '';
        else delete finish.dataset.inverted;
      }
      drawFinish.current(); // text colour lives on the canvas
    };
    const crunch = (atPeak: () => void, then: () => void) => {
      const last = LAP_STEPS.length - 1;
      let i = 0;
      let up = true;
      const tick = () => {
        if (up && i < last) i += 1;
        else if (up) {
          up = false;
          atPeak();
          i -= 1;
        } else i -= 1;
        setBlock(LAP_STEPS[Math.max(0, i)]);
        if (!up && i <= 0) then();
        else flashTimer = window.setTimeout(tick, LAP_STEP_MS);
      };
      flashTimer = window.setTimeout(tick, LAP_STEP_MS);
    };
    const milestoneDue = () => nextMilestone < LAP_MILESTONES.length && tally >= LAP_MILESTONES[nextMilestone];
    const done = () => {
      busy = false;
      if (milestoneDue()) showMilestone(); // reached during the last animation
      else if (pendingReset) {
        pendingReset = false;
        resetTally();
      }
    };
    // Quick finale: flip colours back and forth, ending swapped.
    const finale = (then: () => void) => {
      let n = 0;
      const flip = () => {
        setInverted(!finishLook.current.inverted);
        n += 1;
        flashTimer = window.setTimeout(n < LAP_FINALE_FLASHES ? flip : then, LAP_FINALE_MS);
      };
      flip();
    };
    // "+400": crunch into swapped colours with the milestone, hold, crunch back to blue "FINISH".
    const showMilestone = () => {
      if (!finish || busy || !milestoneDue()) return;
      busy = true;
      const m = LAP_MILESTONES[nextMilestone];
      nextMilestone += 1;
      const isLast = m === tallyMax;
      const backToFinish = () =>
        crunch(() => {
          setInverted(false);
          finishLook.current.text = 'FINISH';
        }, done);
      crunch(
        () => {
          setInverted(true);
          finishLook.current.text = `+${m}`;
        },
        () => {
          const hold = milestoneDue() ? LAP_HOLD_QUEUED_MS : LAP_HOLD_MS;
          flashTimer = window.setTimeout(() => (isLast ? completed() : backToFinish()), hold);
        },
      );
      // last milestone: crunch into "COMPLETED", flash ~2s, crunch back to "FINISH", count from 0 again
      const completed = () =>
        crunch(
          () => (finishLook.current.text = LAP_COMPLETE_TEXT),
          () =>
            finale(() => {
              tally = 0;
              nextMilestone = 0;
              backToFinish();
            }),
        );
    };
    // The track came to rest: the count starts over next time (the bar already reads "FINISH").
    const resetTally = () => {
      if (tally === 0) return;
      if (busy) {
        pendingReset = true;
        return;
      }
      tally = 0;
      nextMilestone = 0;
    };

    const apply = () => {
      const total = d.s + run.x;
      card.style.setProperty('--trk', ((((total % LAP) + LAP) % LAP)).toFixed(2));
      // Count only new ground: laps past the furthest one reached so far. Drifting back (the crouch,
      // wheeling backwards) and forward again over the same line never counts twice.
      const laps = Math.floor(total / LAP);
      if (laps > lapHigh) {
        if (!reduced && tally < tallyMax) {
          pendingReset = false;
          tally = Math.min(tallyMax, tally + (laps - lapHigh) * LAP_METRES); // stops counting at 4000
          showMilestone();
        }
        lapHigh = laps;
      }
    };

    const step = (now: number) => {
      const dt = d.last ? Math.min(0.05, (now - d.last) / 1000) : 1 / 60;
      d.last = now;

      if (run.mode === 'run') {
        run.t += dt;
        run.v += (runSpeed(run.t) - run.v) * Math.min(1, dt * SPEED_FOLLOW);
        run.x += run.v * dt;
      } else if (run.mode === 'coast') {
        // spring toward the projected stop, starting with the running velocity: overshoots, settles back
        const w = (2 * Math.PI) / COAST.response;
        const n = Math.ceil(dt / (1 / 240));
        for (let k = 0; k < n; k++) {
          run.v += (w * w * (run.stopAt - run.x) - 2 * COAST.damping * w * run.v) * (dt / n);
          run.x += run.v * (dt / n);
        }
        if (Math.abs(run.stopAt - run.x) < 0.05 && Math.abs(run.v) < 0.5) {
          run.x = run.stopAt;
          run.v = 0;
          run.mode = 'idle';
        }
      }

      // wheel part keeps its original glide
      const diff = d.target - d.s;
      d.s += Math.abs(diff) < 0.05 ? diff : diff * 0.16;
      apply();

      if (d.s !== d.target || run.mode !== 'idle') d.raf = requestAnimationFrame(step);
      else {
        d.raf = 0;
        d.last = 0;
        resetTally(); // the track has come to rest: the tally goes back to "FINISH"
      }
    };
    const wake = () => {
      if (!d.raf) d.raf = requestAnimationFrame(step);
    };
    const onWheel = (e: WheelEvent) => {
      let dy = e.deltaY || 0;
      if (e.deltaMode === 1) dy *= 16;
      if (e.deltaMode === 2) dy *= 600;
      d.target += dy * 0.35;
      if (reduced) {
        d.s = d.target;
        apply();
        return;
      }
      wake();
    };
    const onEnter = (e: PointerEvent) => {
      if (reduced || e.pointerType !== 'mouse') return;
      // already moving (quick re-entry while coasting)? skip the crouch and pick up from the burst
      run.t = run.v > 20 ? CROUCH_T + 0.25 : 0;
      run.mode = 'run';
      pendingReset = false; // back on the track before the reset played: keep counting
      wake();
    };
    const onLeave = () => {
      if (run.mode !== 'run') return;
      run.stopAt = run.x + Math.max(0, run.v) * COAST_T;
      run.mode = 'coast';
      wake();
    };
    card.addEventListener('wheel', onWheel, { passive: true });
    card.addEventListener('pointerenter', onEnter);
    card.addEventListener('pointerleave', onLeave);
    return () => {
      card.removeEventListener('wheel', onWheel);
      card.removeEventListener('pointerenter', onEnter);
      card.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(d.raf);
      clearTimeout(flashTimer);
    };
  }, []);

  const { W, H } = size ?? FALLBACK;
  const track = useMemo(() => trackView(W, H), [W, H]);
  const { sc, tops } = placement(H, hs);

  return (
    <Card
      ref={cardRef}
      className={styles.card}
      aria-labelledby="gl-title"
      data-area="goals"
      style={{ '--finish-top': `${FINISH_TOP}px`, '--finish-h': `${FINISH_H}px` } as React.CSSProperties}
    >
      <div className={styles.track} aria-hidden="true">
        <div className={styles.move}>
          {track.items.map((it) => (
            <span
              key={it.key}
              className={`${styles.mi} ${it.kind === 'marker' ? styles.mark : `${styles.ic} ms`}`}
              style={{
                offsetPath: `path('${it.path}')`,
                offsetDistance: `calc((var(--trk, 0) + ${it.base}) * 1px)`,
                color: it.color,
              }}
            >
              {it.text}
            </span>
          ))}
        </div>
        <svg className={styles.svg} width="100%" height="100%" viewBox={track.viewBox} preserveAspectRatio="none">
          <path d={track.lanesD} fill="none" stroke="var(--track-lane)" strokeWidth="1" />
        </svg>
        <span className={styles.finish}>
          <canvas ref={finishRef} className={styles.finishCanvas} />
        </span>
      </div>

      <h2 id="gl-title" className={styles.title}>
        {goals.title}
      </h2>

      <ol className={styles.goals} aria-label="Goals, from finish line down to start">
        {sorted.map((g, k) => {
          const done = g.status === 'done';
          const now = g.status === 'in progress';
          let foot: React.ReactNode = done ? 'Done' : now ? 'Now' : 'Up next';
          let detail = g.detail;
          if (g.date) {
            const label = dateLabel(g.date);
            const days = today ? daysUntil(g.date, today) : null;
            if (days === null || days >= 0) {
              // future date: countdown in the foot, detail hidden
              foot = (
                <>
                  {label}
                  {days !== null && (
                    <>
                      {' · '}
                      <Countdown iso={g.date} />
                    </>
                  )}
                </>
              );
              detail = '';
            } else {
              detail = label;
            }
          }
          if (now && g.detail === 'in progress') detail = '';
          const lane = LANES[k % 2];
          const center = ((lane - 0.5) / 5) * 100;
          const left = Math.max(3, Math.min(97 - STICKER_W, center - STICKER_W / 2));
          const [tray, trayInk] = TRAY[g.status];
          return (
            <li
              key={g.title}
              data-sticker
              data-cursor="sticker"
              data-cursor-color="var(--tray-ink)"
              className={`${styles.sticker} ${done ? styles.done : ''}`}
              style={
                {
                  top: `${tops[k].toFixed(1)}px`,
                  left: `${left.toFixed(2)}%`,
                  '--sc': sc.toFixed(3),
                  '--tilt': `${k % 2 ? 1.5 : -1.5}deg`,
                  '--tray': tray,
                  '--tray-ink': trayInk,
                } as React.CSSProperties
              }
            >
              <span className={styles.inner}>
                <span className={styles.gTitle}>{g.title}</span>
                {detail && <span className={styles.detail}>{detail}</span>}
              </span>
              <span className={styles.foot}>
                <span className={styles.footLabel}>
                  {now && <span className={styles.dot} aria-hidden="true" />}
                  {foot}
                </span>
                {done && (
                  <span className={styles.footIcon} role="img" aria-label="Done">
                    <CheckSmall />
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
