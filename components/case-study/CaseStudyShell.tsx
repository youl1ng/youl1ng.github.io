import type { ReactNode } from 'react';
import Nav from '@/components/home/Nav';
import Media from './Media';
import { HERO_NAME } from '@/lib/pageTransition';
import Toc from './Toc';
import type { CaseStudyBase, TocItem } from '@/content/case-studies/types';
import s from './CaseStudy.module.css';

export const Eyebrow = ({ children }: { children: ReactNode }) => <p className={s.eyebrow}>{children}</p>;

/**
 * Text with _underscores_ around a word renders it in italics ("…means photo in Burmese" with _DatPone_).
 * Keeps the content files plain strings.
 */
export function rich(text: string): ReactNode {
  return text.split(/(_[^_]+_)/g).map((part, i) =>
    part.startsWith('_') && part.endsWith('_') && part.length > 2 ? <em key={i}>{part.slice(1, -1)}</em> : part,
  );
}

/** One numbered case-study section: "01 Problem" eyebrow + heading, then its content. */
export function Section({ id, n, label, title, children }: { id: string; n: number; label: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className={s.sec} aria-labelledby={`${id}-h`}>
      <Eyebrow>{`${String(n).padStart(2, '0')} ${label}`}</Eyebrow>
      <h2 id={`${id}-h`} className={s.h2}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Everything every case study shares: nav, hero, intro (title, tagline, links, meta), TL;DR,
 * the sticky "On this page" contents list next to the sections, and the footer.
 */
export default function CaseStudyShell({ cs, toc, children }: { cs: CaseStudyBase; toc: TocItem[]; children: ReactNode }) {
  return (
    <div className={s.page}>
      <Nav />
      <div className={s.navGap} aria-hidden="true" />

      <main>
        <div className={s.wrap}>
          {/* the hero is where a clicked project image lands during the page transition */}
          <Media media={cs.hero} bordered vtName={HERO_NAME} />
        </div>

        <div className={s.wrap}>
          {/* Intro: title + links (left), meta (right) */}
          <div className={s.intro}>
            <div>
              <Eyebrow>{cs.eyebrow}</Eyebrow>
              <h1 className={s.title}>{cs.title}</h1>
              <p className={s.tagline}>{cs.tagline}</p>
              {cs.links.length > 0 && (
              <div className={s.links}>
                {cs.links.map((l) =>
                  l.href ? (
                    <a key={l.label} href={l.href}>
                      {l.label}
                    </a>
                  ) : (
                    // not live yet: no href (so not clickable or a tab stop); the custom cursor shows a
                    // hazard-striped "Coming soon" pill instead of the link treatment
                    <a
                      key={l.label}
                      className={s.soon}
                      aria-disabled="true"
                      data-cursor-mode="dot"
                      data-cursor-label={cs.comingSoon}
                      data-cursor-label-variant="hazard"
                    >
                      {l.label}
                      <span className="visually-hidden"> ({cs.comingSoon.toLowerCase()})</span>
                    </a>
                  ),
                )}
              </div>
              )}
            </div>
            <dl className={s.meta}>
              {cs.meta.map((m) => (
                <div key={m.term}>
                  <dt>{m.term}</dt>
                  <dd>{m.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* TL;DR */}
          <section className={s.tldr} aria-label="TL;DR">
            {cs.tldr.map((t) => (
              <div key={t.label}>
                <h3 className={s.tldrLabel}>{t.label}</h3>
                <p>{t.text}</p>
              </div>
            ))}
          </section>

          <div className={s.layout}>
            <Toc items={toc} />
            <div>{children}</div>
          </div>

          <footer className={s.foot}>
            <a href={cs.footer.back.href}>{cs.footer.back.label}</a>
            <a href={cs.footer.next.href}>{cs.footer.next.label}</a>
          </footer>
        </div>
      </main>
    </div>
  );
}
