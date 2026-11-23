'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import Card from './Card';
import { GithubIcon, LinkedinIcon } from '@/components/icons/Glyphs';
import { socials } from '@/content/home';
import s from './Socials.module.css';

// Lucide 1.x dropped its brand icons; these are the same Lucide paths, drawn white on the brand fill.
const ICONS: Record<string, React.ReactNode> = {
  github: <GithubIcon size={22} strokeWidth={1.8} />,
  linkedin: <LinkedinIcon size={22} strokeWidth={1.8} />,
};

/** Slot 08: copy-email chip (stamps COPIED ✓) + GitHub / LinkedIn brand keys. */
export default function Socials() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const [user, domain] = socials.email.split('@');

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(socials.email);
    } catch {
      // the stamp still shows; the address text is select-all as a fallback
    }
    window.clearTimeout(timer.current);
    setCopied(false); // restart the stamp on every click
    requestAnimationFrame(() => setCopied(true));
    timer.current = window.setTimeout(() => setCopied(false), socials.stampMs);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <Card className={s.card} aria-label="Contact" data-area="socials">
      <div className={s.row}>
        <button
          type="button"
          className={`${s.chip} ${copied ? s.isCopied : ''}`}
          onClick={copy}
          aria-label="Copy email address"
          data-cursor-select /* custom cursor: the chip itself reads as text (text bar over the address)… */
        >
          <span className={s.addr}>
            <span className={s.usr}>{user}</span>
            <span className={s.dom}>@{domain}</span>
          </span>
          {/* …and only the copy icon gets the overlay */}
          <span className={s.act} aria-hidden="true" data-cursor="copy">
            <Copy size={11} strokeWidth={2} />
          </span>
          <span className={s.stamp} aria-hidden="true">
            {socials.copiedLabel}
            <Check size={10} strokeWidth={2.2} />
          </span>
        </button>

        <nav className={s.row} aria-label="Social links">
          {socials.links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className={s.key}
              aria-label={l.label}
              title={l.label}
              data-cursor-label={l.cursorLabel}
              // like the marquee tags: right under the key, in the key's own colour, on the blurred spotlight
              data-cursor-label-style="below"
              data-cursor-label-color={l.fill}
              data-cursor-color={l.fill}
              style={{ '--f': l.fill, '--s': l.edge } as React.CSSProperties}
            >
              {ICONS[l.icon]}
            </a>
          ))}
        </nav>
      </div>

      {/* screen-reader confirmation */}
      <span role="status" aria-live="polite" className="visually-hidden">
        {copied ? socials.copiedAnnounce : ''}
      </span>
    </Card>
  );
}
