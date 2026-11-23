'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, Footprints, Search, Watch } from 'lucide-react';
import Card from './Card';
import TitlePill, { pillStyles } from './TitlePill';
import { ArrowNE } from '@/components/icons/Glyphs';
import { prefersReducedMotion } from '@/lib/pixelText';
import { projects } from '@/content/home';
import { navigate } from '@/lib/pageTransition';
import styles from './SelectedProjects.module.css';

const ICONS = { camera: Camera, watch: Watch, search: Search, footprints: Footprints } as const;

/** Auto-cycling spotlight: preview on top, three rows below; the active row drives the preview. */
export default function SelectedProjects() {
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const hover = useRef(false);
  const focus = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = setInterval(() => {
      if (hover.current || focus.current || document.hidden) return;
      setActive((i) => (i + 1) % projects.items.length);
    }, projects.cycleMs);
    return () => clearInterval(id);
  }, []);

  const openFromClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const t = e.target as Element;
    if (t.closest('a')) return; // the arrow link handles itself
    if (t.closest('[data-cursor-select]')) return; // descriptions are selectable text, not a link
    if (window.getSelection()?.toString()) return; // finishing a text selection isn't a click
    const row = t.closest<HTMLElement>('[data-row]');
    const i = row ? Number(row.dataset.row) : active;
    // page transition: this project's preview morphs into the case-study hero
    navigate(projects.items[i].href, document.querySelector(`[data-image-slot="${projects.items[i].slot}"]`));
  };

  return (
    <Card
      className={styles.card}
      aria-labelledby="pj-title"
      data-area="projects"
      onMouseEnter={() => (hover.current = true)}
      onMouseLeave={() => (hover.current = false)}
      onFocus={() => (focus.current = true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) focus.current = false;
      }}
    >
      <div className={styles.head}>
        <TitlePill id="pj-title">{projects.title}</TitlePill>
        <a href={projects.seeAll.href} className={pillStyles.link}>
          {projects.seeAll.label} <ArrowNE size={10} strokeWidth={2.2} />
        </a>
      </div>

      {/* Preview + rows are one "View project" zone for the custom cursor. Clicking anywhere in it opens
          that row's project (the preview opens the active one). Keyboard users get the arrow links. */}
      <div className={styles.layout} data-cursor-label={projects.cursorLabel} onClick={openFromClick}>
        <div className={styles.preview} aria-hidden="true">
          {projects.items.map((p, i) => {
            const Icon = ICONS[p.icon as keyof typeof ICONS] ?? Camera;
            const showImg = !!p.image && !failed[i];
            return (
              <div
                key={p.slot}
                className={`${styles.layer} ${i === active ? styles.on : ''}`}
                data-image-slot={p.slot}
                // a "contain" picture (transparent PNG) sits straight on the card, with no tinted backdrop
                style={(showImg || ('triangle' in p && p.triangle)) && 'fit' in p && p.fit === 'contain' ? { background: 'none' } : undefined}
              >
                {'triangle' in p && p.triangle ? (
                  // three screens stacked like a triangle: one on top, two below it, overlapping a little
                  <div className={styles.tri}>
                    {p.triangle.map((src, n) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={src} src={src} alt="" className={`${styles.triTile} ${styles[`tri${n}`]}`} draggable={false} />
                    ))}
                  </div>
                ) : showImg ? (
                  <Image
                    className={styles.img}
                    src={p.image}
                    alt=""
                    fill
                    sizes="(min-width: 1100px) 50vw, 100vw"
                    // 'contain' = show the whole picture with breathing room instead of cropping it to fill
                    style={'fit' in p && p.fit === 'contain' ? { objectFit: 'contain', padding: '5%' } : undefined}
                    onError={() => setFailed((f) => ({ ...f, [i]: true }))}
                  />
                ) : (
                  <div className={styles.frame}>
                    <Icon size={30} strokeWidth={1.6} color="var(--ink)" aria-hidden="true" />
                    <span className={styles.cap}>[ {p.name} screenshot ]</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <nav className={styles.list} aria-label="Selected projects">
          {projects.items.map((p, i) => (
            // Hovering a row makes it active; only its arrow is a link.
            <div
              key={p.slot}
              className={`${styles.row} ${i === active ? styles.active : ''}`}
              data-row={i}
              onMouseEnter={() => setActive(i)}
            >
              <span className={styles.nameCol}>
                <span className={styles.name}>{p.name}</span>
                <span className={styles.tags} aria-hidden="true">
                  {p.tags.join(', ')}
                </span>
              </span>
              <span id={`pj-outcome-${i}`} className={styles.outcome} aria-hidden="true" data-cursor-select>
                {p.outcome}
              </span>
              <a
                href={p.href}
                data-vt-source={`[data-image-slot="${p.slot}"]`}
                className={styles.arrow}
                aria-label={p.name}
                aria-describedby={`pj-outcome-${i}`}
                onFocus={() => setActive(i)}
              >
                <ArrowNE size={14} />
              </a>
            </div>
          ))}
        </nav>
      </div>
    </Card>
  );
}
