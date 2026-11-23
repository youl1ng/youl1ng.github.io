// Page transitions: internal navigations run inside a same-document View Transition
// (document.startViewTransition: Chrome, Edge, Safari 18+, Firefox 144+). The router does a client-side
// navigation inside the transition, so the old page is captured, the new one renders, and CSS
// (globals.css, ::view-transition-*) animates between them. Browsers without support, and people
// with reduced motion, just navigate (still client-side, so it's fast).

type Push = (href: string) => void;

let push: Push | null = null;
let resolveRendered: (() => void) | null = null;

/** Name given to the clicked project image and to the case-study hero, so one morphs into the other. */
export const HERO_NAME = 'project-hero';

/** Called once by <PageTransitions /> with the router's push. */
export function registerRouter(fn: Push | null) {
  push = fn;
}

/** Called by <PageTransitions /> after the new route has rendered: lets the transition continue. */
export function routeRendered() {
  resolveRendered?.();
  resolveRendered = null;
}

type DocWithVT = Document & {
  startViewTransition?: (update: () => Promise<void> | void) => { finished: Promise<void>; ready: Promise<void> };
};

/**
 * Go to `href` with a page transition. `source` (optional) is the project image the user clicked:
 * it gets the shared name for this one transition, so it morphs into the next page's hero.
 */
export function navigate(href: string, source?: Element | null) {
  if (!push) {
    window.location.href = href;
    return;
  }
  const doc = document as DocWithVT;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!doc.startViewTransition || reduced) {
    push(href);
    return;
  }
  const src = source as HTMLElement | null | undefined;
  if (src) src.style.setProperty('view-transition-name', HERO_NAME);
  const go = push;
  const vt = doc.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          // new page starts at the top, instantly (html has smooth scrolling for the contents links,
          // which would otherwise glide up from the old page's scroll position mid-transition)
          if (!href.includes('#')) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          resolve();
        };
        resolveRendered = finish;
        go(href);
        window.setTimeout(finish, 1200); // never hang if the route takes long
      }),
  );
  // a skipped transition (hidden tab, a second click mid-transition) rejects `ready`: the page still
  // changes, just without the animation, so there's nothing to report
  vt.ready.catch(() => {});
  vt.finished.catch(() => {}).finally(() => src?.style.removeProperty('view-transition-name'));
}

/** Should this click be turned into a transitioned in-app navigation? Returns the path, or null. */
export function transitionHref(e: MouseEvent): { href: string; link: HTMLAnchorElement } | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  const link = (e.target as Element | null)?.closest?.('a');
  if (!link || !link.hasAttribute('href') || link.target || link.hasAttribute('download')) return null;
  if (link.getAttribute('aria-disabled') === 'true') return null;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  // same page (incl. #section links): leave it to the browser
  if (url.pathname === window.location.pathname) return null;
  // files (resume PDF, images) and the old static /social page aren't app routes
  if (/\.[a-z0-9]+$/i.test(url.pathname) || url.pathname.startsWith('/social') || url.pathname.startsWith('/assets')) return null;
  return { href: url.pathname + url.search + url.hash, link };
}
