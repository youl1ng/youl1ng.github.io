'use client';

import { useEffect, useRef, useState } from 'react';
import s from './CaseStudy.module.css';

/**
 * Sticky "On this page" list with scroll-spy: the last section whose top has passed ~35% down the screen is current.
 * The last sections are short, so the page can run out of room before they reach that line. Two fixes for that:
 * at the very bottom of the page the last item wins, and clicking an item pins it as current until the reader scrolls again.
 */
export default function Toc({ items }: { items: { id: string; label: string }[] }) {
  const [current, setCurrent] = useState(items[0]?.id);
  const pinned = useRef(false);

  useEffect(() => {
    const unpin = () => {
      pinned.current = false;
    };

    const spy = () => {
      if (pinned.current) return;
      const line = window.innerHeight * 0.35;
      let id = items[0]?.id;
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top <= line) id = it.id;
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) id = items[items.length - 1]?.id;
      setCurrent(id);
    };

    spy();
    window.addEventListener('scroll', spy, { passive: true });
    window.addEventListener('resize', spy);
    // real user input releases a clicked item (programmatic scrolling fires none of these)
    window.addEventListener('wheel', unpin, { passive: true });
    window.addEventListener('touchstart', unpin, { passive: true });
    window.addEventListener('keydown', unpin);
    return () => {
      window.removeEventListener('scroll', spy);
      window.removeEventListener('resize', spy);
      window.removeEventListener('wheel', unpin);
      window.removeEventListener('touchstart', unpin);
      window.removeEventListener('keydown', unpin);
    };
  }, [items]);

  return (
    <div className={s.toc}>
      <p className={`${s.eyebrow} ${s.tocLabel}`}>On this page</p>
      <nav aria-label="On this page">
        <ul>
          {items.map((it, i) => (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                className={`${s.tocLink} ${current === it.id ? s.tocOn : ''}`}
                aria-current={current === it.id ? 'true' : undefined}
                data-cursor-mode="dot" /* small accent dot, like the main nav */
                onClick={() => {
                  pinned.current = true;
                  setCurrent(it.id);
                }}
              >
                <span className={s.tocN}>{String(i + 1).padStart(2, '0')}</span>
                <span>{it.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
