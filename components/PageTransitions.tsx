'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { navigate, registerRouter, routeRendered, transitionHref } from '@/lib/pageTransition';

/**
 * Mounted once in the root layout. Turns clicks on internal links into client-side navigations that
 * run inside a View Transition (see lib/pageTransition.ts), and tells the transition when the new
 * route has rendered. Renders nothing.
 */
export default function PageTransitions() {
  const router = useRouter();
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    registerRouter((href) => router.push(href));
    return () => registerRouter(null);
  }, [router]);

  // the new route's DOM is in place: let the transition animate to it
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    routeRendered();
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const hit = transitionHref(e);
      if (!hit) return;
      e.preventDefault();
      e.stopPropagation(); // next/link would otherwise navigate a second time, outside the transition
      // a link can name the image to morph from (data-vt-source = CSS selector), e.g. a project cover
      const sel = hit.link.getAttribute('data-vt-source');
      navigate(hit.href, sel ? document.querySelector(sel) : null);
    };
    // capture phase on the document: runs before anything on the link itself
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
