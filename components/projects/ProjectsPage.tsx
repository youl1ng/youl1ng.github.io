'use client';

import { useEffect, useState } from 'react';
import Nav from '@/components/home/Nav';
import { ArrowNE } from '@/components/icons/Glyphs';
import UnderConstructionFooter from '@/components/UnderConstructionFooter';
import { coverLabel, projects, projectsPage as pg, type Category, type FilterKey } from '@/content/projects';
import s from './ProjectsPage.module.css';

const keyFromUrl = (): FilterKey => {
  const q = new URLSearchParams(window.location.search).get('filter');
  return pg.filters.find((f) => f.key.toLowerCase() === q?.toLowerCase())?.key ?? 'All';
};

/** /projects: heading, keycap filters and the project card grid (PROJECTS_PAGE_HANDOFF.md, board P4). */
export default function ProjectsPage() {
  const [filter, setFilter] = useState<FilterKey>('All');
  const [announce, setAnnounce] = useState('');

  // shareable filter: /projects?filter=design (read after mount, so the static HTML is the "All" view)
  useEffect(() => setFilter(keyFromUrl()), []);

  const shown =
    filter === 'All' ? projects : projects.filter((p) => (p.categories as readonly Category[]).includes(filter as Category));

  const pick = (key: FilterKey) => {
    setFilter(key);
    const n = key === 'All' ? projects.length : projects.filter((p) => (p.categories as readonly Category[]).includes(key as Category)).length;
    setAnnounce(pg.announce(n));
    const url = new URL(window.location.href);
    if (key === 'All') url.searchParams.delete('filter');
    else url.searchParams.set('filter', key.toLowerCase());
    window.history.replaceState(null, '', url);
  };

  return (
    <div className={s.page}>
      <Nav />
      <div className={s.navGap} aria-hidden="true" />

      <main className={s.wrap}>
        <h1 className={s.heading}>
          {pg.heading.before}
          <em className={s.em}>{pg.heading.em}</em>
          {pg.heading.after}
        </h1>

        <div className={s.filters} role="group" aria-label={pg.filterLabel}>
          {pg.filters.map((f) => (
            <button
              key={f.key}
              type="button"
              className={s.key}
              aria-pressed={filter === f.key}
              style={{ '--f': f.fill, '--i': f.ink } as React.CSSProperties}
              onClick={() => pick(f.key)}
            >
              {f.key}
            </button>
          ))}
        </div>

        <span role="status" aria-live="polite" className="visually-hidden">
          {announce}
        </span>

        <div className={s.grid}>
          {shown.length === 0 && <p className={s.empty}>{pg.empty}</p>}
          {shown.map((p) => (
            <a
              key={p.slug}
              // no case study yet: not a link (no href, so not clickable or a tab stop)
              href={p.page ? `/projects/${p.slug}` : undefined}
              className={p.page ? s.card : `${s.card} ${s.soon}`}
              aria-label={p.page ? p.name : `${p.name} (${pg.comingSoon.toLowerCase()})`}
              aria-describedby={`pj-${p.slug}-outcome`}
              aria-disabled={p.page ? undefined : true}
              draggable={false} // a click opens it; no browser link/image drag ghost
              onDragStart={(e) => e.preventDefault()}
              // custom cursor: the homepage's "View project" dot + label, not a full-card overlay;
              // unbuilt projects get the hazard-striped "Coming soon" pill instead
              data-cursor-mode="dot"
              data-cursor-label={p.page ? pg.cursorLabel : pg.comingSoon}
              data-cursor-label-variant={p.page ? undefined : 'hazard'}
              // page transition: the cover morphs into the case-study hero
              data-vt-source={p.page ? `#cover-${p.slug}` : undefined}
            >
              {'cover' in p && p.cover ? (
                <div id={`cover-${p.slug}`} className={`${s.cover} ${s.coverImg}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.cover.src}
                    alt=""
                    draggable={false}
                    style={p.cover.fit === 'contain' ? { objectFit: 'contain', padding: '6%' } : undefined}
                  />
                </div>
              ) : (
                <div id={`cover-${p.slug}`} className={s.cover} role="img" aria-label={coverLabel(p.name)}>
                  <span>{coverLabel(p.name)}</span>
                </div>
              )}
              <div className={s.info}>
                <div>
                  <h2 className={s.name}>{p.name}</h2>
                  <p id={`pj-${p.slug}-outcome`} className={s.outcome}>
                    {p.outcome}
                  </p>
                  <p className={s.tags}>{p.tags.join(', ')}</p>
                </div>
                <span className={s.arrow} aria-hidden="true">
                  <ArrowNE size={14} strokeWidth={1.8} />
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* page still in progress: the shared "under construction" footer stands in for the small
            ooniverse.me / Back to home footer (its "Back to home →" covers that link) */}
        <UnderConstructionFooter />
      </main>
    </div>
  );
}
