'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Server, Watch } from 'lucide-react';
import Card from './Card';
import TitlePill from './TitlePill';
import { PlusSmall } from '@/components/icons/Glyphs';
import { work } from '@/content/home';
import styles from './WorkExperience.module.css';

const ICONS = { watch: Watch, server: Server } as const;
const GAP = 12;
const PLAY_MIN = 68; // Playground never gets shorter than this (= the Socials card), see Playground.module.css
const NARROW_QUERY = '(max-width: 1099px)';

type Dims = { s1H: number; colH: number; narrow: boolean; weBase: number; weNeed: number };

/**
 * Each role shows a one-line summary bullet when collapsed; the + swaps it for the full bullet list.
 * Desktop: collapsed, the card hugs its content and Playground fills the rest of the column; opening
 * grows it as a bottom-anchored overlay UPWARD over the name card (Playground stays put). Nothing
 * scrolls inside it, except on windows too short to hold everything (last resort). ≤1099px: plain
 * inline expand.
 */
export default function WorkExperience() {
  const [open, setOpen] = useState(false);
  const [dims, setDims] = useState<Dims | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  /** Natural card height: paddings + borders + header + 12 + each role (its top row, then the one-line
   *  summary when collapsed or the full details when open) + 8 between. */
  const natural = useCallback((withDetails: boolean) => {
    const card = cardRef.current;
    if (!card) return 0;
    const cs = getComputedStyle(card);
    let h =
      parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const head = headRef.current;
    if (head) h += head.getBoundingClientRect().height + GAP;
    card.querySelectorAll<HTMLElement>('[data-role]').forEach((r, i) => {
      const det = r.querySelector<HTMLElement>('[data-details]');
      const inner = r.querySelector<HTMLElement>('[data-details-inner]');
      const sum = r.querySelector<HTMLElement>('[data-summary]');
      const sumInner = r.querySelector<HTMLElement>('[data-summary-inner]');
      const now = (det?.getBoundingClientRect().height ?? 0) + (sum?.getBoundingClientRect().height ?? 0);
      const shown = withDetails ? inner?.scrollHeight ?? 0 : sumInner?.scrollHeight ?? 0;
      h += r.getBoundingClientRect().height - now + shown;
      if (i > 0) h += 8;
    });
    return Math.ceil(h);
  }, []);

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const col = wrap?.closest<HTMLElement>('[data-col="a"]');
    const slot1 = col?.querySelector<HTMLElement>('[data-slot="name"]');
    if (!wrap || !col || !slot1) return;
    const next: Dims = {
      s1H: Math.round(slot1.getBoundingClientRect().height),
      colH: Math.round(col.getBoundingClientRect().height),
      narrow: window.matchMedia(NARROW_QUERY).matches,
      weBase: natural(false),
      weNeed: natural(true),
    };
    setDims((d) =>
      d && d.s1H === next.s1H && d.colH === next.colH && d.narrow === next.narrow && d.weBase === next.weBase && d.weNeed === next.weNeed
        ? d
        : next,
    );
  }, [natural]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const col = wrap?.closest<HTMLElement>('[data-col="a"]');
    const slot1 = col?.querySelector<HTMLElement>('[data-slot="name"]');
    const ro = new ResizeObserver(() => measure());
    [slot1, col, cardRef.current].forEach((el) => el && ro.observe(el));
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    measure();
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  const toggle = () => {
    setOpen((o) => !o);
    measure();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      e.stopPropagation();
      setOpen(false);
      toggleRef.current?.focus();
    }
  };

  // Height plan (desktop only). Until measured, the card sits in normal flow so there's no jump on load.
  let flowH: number | undefined;
  let cardH: number | undefined;
  const overlay = !!dims && !dims.narrow && dims.s1H > 0 && dims.colH > 0;
  const isOpen = open;
  let room = 0; // the most the collapsed card may take (Playground keeps PLAY_MIN)
  let maxCard = 0; // the most the open card may take: everything above Playground
  if (overlay) {
    room = Math.max(120, dims.colH - dims.s1H - 2 * GAP - PLAY_MIN);
    flowH = Math.min(dims.weBase || room, room); // collapsed: hug the content; Playground takes the rest
    maxCard = dims.s1H + GAP + flowH;
    cardH = isOpen ? Math.min(maxCard, Math.max(flowH, dims.weNeed || flowH)) : flowH;
  }
  // desktop, closed: each role shows its one-line summary; on a window too short even for that,
  // the cut-off edge fades out instead of a hard crop
  const clipped = overlay && !isOpen && dims.weBase > room;
  // last resort on very short windows: even the full open card can't hold everything, so it scrolls
  const scrolls = overlay && isOpen && dims.weNeed > maxCard;

  // closing always returns the list to the top
  useEffect(() => {
    if (!isOpen && bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [isOpen]);

  const ids = work.roles.map((r) => r.id).join(' ');

  return (
    <div
      ref={wrapRef}
      className={`${styles.wrap} ${overlay ? styles.measured : ''}`}
      style={flowH !== undefined ? { height: flowH } : undefined}
      data-area="work"
    >
      <Card
        ref={cardRef}
        className={`${styles.card} ${isOpen ? styles.open : ''} ${clipped ? styles.clipped : ''} ${scrolls ? styles.scrolls : ''}`}
        style={cardH !== undefined ? { height: cardH } : undefined}
        aria-labelledby="we-title"
        onKeyDown={onKeyDown}
      >
        <div ref={headRef} className={styles.head}>
          <TitlePill id="we-title">{work.title}</TitlePill>
          {/* Only the plus toggles the card */}
          <button
            ref={toggleRef}
            type="button"
            className={styles.plus}
            aria-expanded={isOpen}
            aria-controls={ids}
            aria-label={isOpen ? 'Hide work details' : 'Show all work details'}
            data-cursor-label={isOpen ? 'collapse' : 'expand'}
            onClick={toggle}
          >
            <PlusSmall />
          </button>
        </div>

        <div ref={bodyRef} className={styles.body}>
          {work.roles.map((role) => {
            const Icon = ICONS[role.icon as keyof typeof ICONS] ?? Watch;
            return (
              <article key={role.id} className={styles.role} data-role aria-labelledby={`${role.id}-name`}>
                <div className={styles.roleRow}>
                  <span className={styles.icon} aria-hidden="true">
                    <Icon size={18} strokeWidth={1.6} color="var(--ink)" />
                  </span>
                  <span className={styles.text}>
                    <h3 id={`${role.id}-name`} className={styles.roleName}>
                      {role.name}
                    </h3>
                    <span className={styles.sub}>{role.subtitle}</span>
                  </span>
                  {role.now && (
                    <span className={styles.now}>
                      <span className={styles.nowDot} aria-hidden="true" />
                      Now
                    </span>
                  )}
                </div>
                {/* collapsed: one general bullet about the role; open: swapped for the full list */}
                <div className={styles.summary} data-summary aria-hidden={isOpen || undefined}>
                  <div className={styles.detailsInner} data-summary-inner>
                    <ul className={styles.tree}>
                      <li>{role.summary}</li>
                    </ul>
                  </div>
                </div>
                <div className={styles.details} id={role.id} data-details inert={!isOpen}>
                  <div className={styles.detailsInner} data-details-inner>
                    <ul className={styles.tree}>
                      {role.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                    <p className={styles.stack}>{role.stack.join(' · ')}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
