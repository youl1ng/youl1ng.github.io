'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { nav } from '@/content/home';
import s from './Nav.module.css';

/** Centred main nav (Home v2). Current page: a square pixel dot that morphs into an underline on hover. */
export default function Nav() {
  const path = usePathname();
  // Home only on "/"; other sections also own their sub-pages (/projects/1up → Projects)
  const isOn = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`));
  return (
    <header className={s.nav}>
      <nav aria-label="Main">
        <ul>
          {nav.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                // the other pages don't exist yet: don't prefetch them (avoids 404s in the static export)
                prefetch={false}
                // custom cursor: shrinks to the small accent dot (no overlay); the stretching underline
                // is the hover feedback
                data-cursor-mode="dot"
                className={`${s.lk} ${isOn(l.href) ? s.isOn : ''}`}
                aria-current={isOn(l.href) ? 'page' : undefined}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
