'use client';

import { useState } from 'react';
import { myThing, type PaletteName } from '@/content/home';
import { setAccent } from '@/lib/accent';
import styles from './TagMarquee.module.css';

/** A tag's colour: one of the palette pairs, or Ink Blue once it has been swapped out of the site. */
type Swatch = PaletteName | 'ink-blue';

const swatchName = (c: Swatch) => (c === 'ink-blue' ? 'Ink Blue' : c[0].toUpperCase() + c.slice(1));
const inkOf = (c: Swatch) => (c === 'ink-blue' ? 'var(--ink-blue)' : `var(--${c}-ink)`); // a tag's own colour
const CURSOR_LINES = myThing.cursorLines.join('|'); // the cursor picks one at random per hover

function TagList({
  row,
  colorOf,
  onPick,
  hidden,
}: {
  row: number;
  colorOf: (row: number, i: number) => Swatch;
  onPick: (row: number, i: number) => void;
  hidden?: boolean;
}) {
  return (
    <ul className={styles.list} aria-hidden={hidden || undefined}>
      {myThing.rows[row].tags.map((t, i) => {
        const c = colorOf(row, i);
        return (
          <li key={t.text} className={styles.item}>
            <button
              type="button"
              className={styles.tag}
              style={{ background: `var(--${c})`, color: `var(--${c}-ink)` }}
              onClick={() => onPick(row, i)}
              // the second copy only exists for the seamless loop: clickable, but not a second tab stop
              tabIndex={hidden ? -1 : undefined}
              aria-label={hidden ? undefined : `${t.text}: make ${swatchName(c)} the site colour`}
              data-cursor-color={inkOf(c)}
              // a random line sits right over (top row) or under (bottom row) the stopped tag, in its
              // colour, on a blurred spotlight so whatever it overlaps can't fight it
              data-cursor-label={CURSOR_LINES}
              data-cursor-label-style={row === 0 ? 'above' : 'below'}
              data-cursor-label-color={inkOf(c)}
            >
              {t.text}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Two endless tag rows (pure CSS animation) with a pause toggle (WCAG 2.2.2). Every tag is a colour
 * swatch: clicking it swaps its colour with the site accent. Ink Blue is the default and comes back
 * on reload.
 */
export default function TagMarquee() {
  const [paused, setPaused] = useState(false);
  const [accent, setAccentState] = useState<Swatch>('ink-blue');
  const [swapped, setSwapped] = useState<Record<string, Swatch>>({}); // tags showing another colour
  const [announce, setAnnounce] = useState('');
  const colorOf = (row: number, i: number): Swatch => swapped[`${row}-${i}`] ?? myThing.rows[row].tags[i].color;

  const pick = (row: number, i: number) => {
    const key = `${row}-${i}`;
    const next = colorOf(row, i);
    if (next === accent) return;
    setSwapped((s) => {
      const copy = { ...s };
      if (accent === myThing.rows[row].tags[i].color) delete copy[key]; // back to its own colour
      else copy[key] = accent;
      return copy;
    });
    setAccentState(next);
    setAccent(next);
    setAnnounce(`Site colour: ${swatchName(next)}`);
  };

  return (
    <div className={styles.marquee} data-paused={paused || undefined}>
      <button
        type="button"
        className={styles.toggle}
        aria-label={paused ? 'play tag animation' : 'pause tag animation'}
        onClick={() => setPaused((p) => !p)}
      >
        {paused ? 'play' : 'pause'}
      </button>
      <div className={styles.rows}>
        {myThing.rows.map((row, r) => (
          <div key={row.label} className={styles.row} role="group" aria-label={row.label}>
            <div
              className={`${styles.track} ${row.direction === 'left' ? styles.left : styles.right}`}
              style={{ animationDuration: `${row.durationS}s`, animationDelay: `${row.delayS}s` }}
            >
              <TagList row={r} colorOf={colorOf} onPick={pick} />
              <TagList row={r} colorOf={colorOf} onPick={pick} hidden />
            </div>
          </div>
        ))}
      </div>
      <span role="status" aria-live="polite" className="visually-hidden">
        {announce}
      </span>
    </div>
  );
}
