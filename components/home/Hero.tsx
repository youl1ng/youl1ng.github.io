'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Card from './Card';
import styles from './Hero.module.css';
import { hero } from '@/content/home';
import type { WordPile } from './wordPile';

/** -1 = the starting word ("things"); 0… = hero.words (loops). */
const wordAt = (i: number) => (i < 0 ? { text: hero.word, color: null } : hero.words[i % hero.words.length]);
const chipStyle = (color: string | null) =>
  (color ? { '--c': `var(--${color})`, '--c-ink': `var(--${color}-ink)` } : undefined) as React.CSSProperties | undefined;

/**
 * "I design and build things …": a small circle over "things" leads the pointer to it; there the cursor
 * turns into a hammer (CustomCursor, data-cursor-mode="hammer"). Hitting the word knocks it off the
 * line: it drops to the bottom of the card as a physics body (wordPile.ts) and stacks, and the next
 * word from the cycle takes its place in the sentence, which reflows around it. Fallen words can be
 * grabbed (data-cursor-mode="grab") and thrown out of the card; once they're all out, it starts over.
 */
export default function Hero() {
  const [i, setI] = useState(-1);
  const [hits, setHits] = useState(0); // since the last reset
  const [cycled, setCycled] = useState(false); // the word has changed at least once (new words pop in)
  const [announce, setAnnounce] = useState('');
  const textRef = useRef<HTMLHeadingElement>(null);
  const chipRef = useRef<HTMLSpanElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const pile = useRef<Promise<WordPile> | null>(null);
  const textTop = useRef<number | null>(null); // the sentence's position before it moves (for the glide)
  const piled = hits > 0;

  // every word thrown out: back to the start
  const reset = useCallback(() => {
    textTop.current = textRef.current?.getBoundingClientRect().top ?? null;
    setI(-1);
    setHits(0);
    setAnnounce(hero.announce(hero.word));
  }, []);

  // the physics (and matter-js itself) load the first time the hammer comes out
  const getPile = useCallback(() => {
    if (!pile.current) {
      const layer = layerRef.current!;
      pile.current = import('./wordPile').then(({ WordPile }) =>
        WordPile.create(layer, {
          // the pile has to stay under the sentence
          ceiling: () => textRef.current!.getBoundingClientRect().bottom - layer.getBoundingClientRect().top - 4,
          onEmpty: reset,
        }),
      );
    }
    return pile.current;
  }, [reset]);

  useEffect(
    () => () => {
      pile.current?.then((p) => p.destroy());
    },
    [],
  );

  // first hit: the sentence moves from the middle of the card to the top, to make room for the pile
  // (and back on reset). It glides there (FLIP: jump to the new layout, animate from the old position).
  useLayoutEffect(() => {
    const text = textRef.current;
    if (textTop.current === null || !text) return;
    const dy = textTop.current - text.getBoundingClientRect().top;
    textTop.current = null;
    if (Math.abs(dy) < 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    text.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], {
      duration: 560,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    });
  }, [piled]);

  const hit = () => {
    if (hits === 0) textTop.current = textRef.current?.getBoundingClientRect().top ?? null;
    const chip = chipRef.current;
    const layer = layerRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (chip && layer && !reduced) {
      // a copy of the word, exactly where it sits, becomes the falling body
      const cr = chip.getBoundingClientRect();
      const lr = layer.getBoundingClientRect();
      const x = cr.left - lr.left;
      const y = cr.top - lr.top;
      // knocked down and off to one side (mostly towards the emptier half of the pile), with a spin
      let lean = 0;
      layer.querySelectorAll(`.${styles.fallen}`).forEach((f) => {
        const r = f.getBoundingClientRect();
        lean += r.left + r.width / 2 < lr.left + lr.width / 2 ? -r.width : r.width;
      });
      const emptier = lean === 0 ? (Math.random() < 0.5 ? -1 : 1) : lean > 0 ? -1 : 1;
      const dir = Math.random() < 0.75 ? emptier : -emptier;
      const { text, color } = wordAt(i);
      const el = document.createElement('span');
      el.className = `${styles.chip} ${styles.fallen}`;
      if (color) {
        el.dataset.c = '';
        el.style.setProperty('--c', `var(--${color})`);
        el.style.setProperty('--c-ink', `var(--${color}-ink)`);
      }
      el.style.width = `${cr.width}px`;
      el.style.height = `${cr.height}px`;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.textContent = text;
      el.dataset.cursor = ''; // a cursor target…
      el.dataset.cursorMode = 'grab'; // …where it becomes a hand: grab it, throw it
      layer.append(el);
      const kick = {
        vx: dir * (1.5 + Math.random() * 3.5),
        vy: 1 + Math.random() * 1.5,
        spin: dir * (0.015 + Math.random() * 0.035), // enough to tumble, not enough to land upside down
      };
      getPile().then((p) => p.add(el, x, y, cr.width, cr.height, kick));
    }
    const next = i + 1;
    setI(next);
    setHits((h) => h + 1);
    setCycled(true);
    setAnnounce(hero.announce(wordAt(next).text));
  };

  const word = wordAt(i);
  const first = hits === 0;

  return (
    <Card className={`${styles.hero} ${piled ? styles.piled : ''}`} aria-labelledby="hero-title" data-area="hero">
      <h1 id="hero-title" ref={textRef} className={styles.text}>
        {hero.before}{' '}
        <button
          type="button"
          className={styles.word}
          onClick={hit}
          onPointerEnter={() => getPile()} // warm up: no load delay on the first hit
          aria-describedby="hero-hit-hint"
          data-cursor-mode="hammer" // the custom cursor turns into a hammer here
        >
          {/* the guide: a small circle over the word, until the first hit (it hides once you're there:
              CSS :hover, not pointer events, which get lost when the word under the pointer is swapped) */}
          {first && (
            <span className={styles.hint} aria-hidden="true">
              <span className={styles.bob} />
            </span>
          )}
          <span
            key={i}
            ref={chipRef}
            className={styles.chip}
            data-c={word.color ? '' : undefined}
            data-new={cycled ? '' : undefined}
            style={chipStyle(word.color)}
          >
            {word.text}
          </span>
        </button>{' '}
        {hero.after}
      </h1>
      {/* the pile: hammered-off words, on top of the card, never under the sentence (see wordPile.ts) */}
      <div ref={layerRef} className={styles.pile} aria-hidden="true" />
      <span id="hero-hit-hint" className="visually-hidden">
        {hero.hitHint}
      </span>
      <span role="status" aria-live="polite" className="visually-hidden">
        {announce}
      </span>
    </Card>
  );
}
