// Site accent (Ink Blue by default). Clicking a marquee tag swaps it by setting data-accent on <html>;
// tokens.css maps that to the --accent* tokens. Canvases can't read CSS, so they listen for the event.

export const ACCENT_EVENT = 'ooniverse:accent';

/** 'ink-blue' = the default (no attribute). */
export function setAccent(name: string) {
  const root = document.documentElement;
  if (name === 'ink-blue') delete root.dataset.accent;
  else root.dataset.accent = name;
  document.dispatchEvent(new Event(ACCENT_EVENT));
}

/** Current value of a CSS custom property on <html>, e.g. cssVar('--accent-on'). */
export function cssVar(name: string, fallback = ''): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
