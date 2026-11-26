// Projects page (/projects): heading, filters and the project list. Edit here, not in components.
// Order = display order (newest first).
// The categories per project are a first guess, to confirm.
// `page: true` = its case study exists. Without it the card isn't a link yet: hovering shows the
// hazard-striped "Coming soon" pill instead. Flip it on once /projects/<slug> is built.

export type Category = 'Design' | 'Code' | 'Mobile' | 'Wearables' | 'Research';
export type FilterKey = 'All' | Category;

export const projectsPage = {
  title: 'Projects — Owen Oo',
  // "Things I've designed and built": only `em` is set in Fraunces italic
  heading: { before: "Things I've ", em: 'designed', after: ' and built' },
  filterLabel: 'Filter projects',
  // fill + ink pairs from the palette ("All" uses the site accent, Ink Blue by default)
  filters: [
    { key: 'All', fill: 'var(--accent)', ink: 'var(--accent-on)' },
    { key: 'Design', fill: 'var(--lemon)', ink: 'var(--lemon-ink)' },
    { key: 'Code', fill: 'var(--sky)', ink: 'var(--sky-ink)' },
    { key: 'Mobile', fill: 'var(--seafoam)', ink: 'var(--seafoam-ink)' },
    { key: 'Wearables', fill: 'var(--orchid)', ink: 'var(--orchid-ink)' },
    { key: 'Research', fill: 'var(--lavender)', ink: 'var(--lavender-ink)' },
  ] as { key: FilterKey; fill: string; ink: string }[],
  empty: 'Nothing here yet.',
  announce: (n: number) => `Showing ${n} ${n === 1 ? 'project' : 'projects'}`,
  cursorLabel: 'View project',
  comingSoon: 'Coming soon',
  footer: { site: 'ooniverse.me', back: { label: '↑ Back to home', href: '/' } },
};

export const projects = [
  { slug: '1up', name: '1Up', page: true,
    cover: { src: '/projects/1up/hero.png', fit: 'contain' }, // transparent PNG: sits on the card, no backdrop
    outcome: "A head-to-head running app that compares your run stats with a friend's, even on different watches.",
    tags: ['Product design', 'React', 'Data visualization'], categories: ['Design', 'Code', 'Mobile'] },
  { slug: 'datpone', name: 'DatPone', page: true,
    cover: { src: '/projects/datpone/home-login.webp', fit: 'cover' }, // just the sign-in screen
    outcome: 'A browser photobooth that turns any phone into a wireless camera. Used by 320+ people across 5 live events.',
    tags: ['Next.js', 'WebRTC', 'Full stack'], categories: ['Design', 'Code'] },
  { slug: 'moca', name: 'MOCA Lab: Watch labeling', page: false,
    outcome: 'Cut activity labeling from 4 steps to 1 press for older adults.',
    tags: ['Wearables', 'Accessibility', 'Android'], categories: ['Design', 'Code', 'Wearables', 'Research'] },
  { slug: 'cs-account-search', name: 'CS Account Search', page: false,
    outcome: "Redesigning the department's staff lookup tool around repeat lookups.",
    tags: ['UX redesign', 'TypeScript', 'PHP'], categories: ['Design', 'Code', 'Research'] },
] satisfies { slug: string; name: string; page: boolean; cover?: { src: string; fit: 'cover' | 'contain' }; outcome: string; tags: string[]; categories: Category[] }[];

/** Cover placeholder label, derived from the name. */
export const coverLabel = (name: string) => `[${name} cover]`;
