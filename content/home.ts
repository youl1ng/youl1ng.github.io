// All Home copy & data. Edit here, not in components.

export type PaletteName = 'lemon' | 'seafoam' | 'sky' | 'lavender' | 'orchid' | 'cheek' | 'apricot';

export const site = {
  name: 'Owen Oo',
  domain: 'ooniverse.me',
};

/* Main nav (Home v2). Pages other than Home don't exist yet. */
export const nav = [
  { label: 'Home', href: '/' },
  { label: 'Projects', href: '/projects' },
  { label: 'About', href: '/about' },
];

/* Slot 01 — name card */
export const nameCard = {
  words: ['OWEN', 'OO', 'BONE', 'OO'],          // cycles in this order
  staticWord: 'OWEN OO',                        // reduced motion
  ariaLabel: 'Owen Oo',
  blockSteps: [3, 4, 5, 7, 10, 14, 20],         // px per pixel, sharp → crunched
  holdMs: 1600,
  stepMs: 80,
  font: 'Georgia, serif',
  caption: "yes, bone's my name too",
};

export const myThing = {
  headingItalic: "what's",
  headingBold: 'MY',
  headingRest: 'thing?',
  // Tags are colour swatches: clicking one makes its colour the site accent (Ink Blue by default)
  // and the tag takes the colour that was the accent before (a swap). Reload = back to Ink Blue.
  // One of these shows beside the cursor, at random, whenever you hover a tag:
  cursorLines: ['style me', 'click me', 'paint the site', 'try this colour', 'swap me in', 'pick me!', 'switch it up'],
  rows: [
    {
      label: 'Work', direction: 'left' as const, durationS: 26, delayS: 0,
      tags: [
        { text: 'Creative', color: 'lemon' }, { text: 'Design', color: 'seafoam' },
        { text: 'Code', color: 'sky' }, { text: 'UI/UX', color: 'lavender' },
        { text: 'Wearables', color: 'orchid' }, { text: 'Pixel art', color: 'cheek' },
      ] as { text: string; color: PaletteName }[],
    },
    {
      label: 'Life', direction: 'right' as const, durationS: 30, delayS: -11,
      tags: [
        { text: 'Fitness', color: 'apricot' }, { text: 'Badminton', color: 'sky' },
        { text: 'Running', color: 'orchid' }, { text: 'Art', color: 'lemon' },
        { text: 'Games', color: 'lavender' }, { text: 'Ideas', color: 'seafoam' },
      ] as { text: string; color: PaletteName }[],
    },
  ],
};

/* Slot 02 — Work & Experience */
export const work = {
  title: 'Work & Experience',
  roles: [
    {
      id: 'we-moca', name: 'MOCA Lab', subtitle: 'Wearable & mobile dev, UI/UX', icon: 'watch', now: true,
      // collapsed card: one general line about the role (expanding swaps it for the bullets below)
      summary: 'Building a Fitbit watch app that helps older adults label their daily activities',
      bullets: [
        'Built a Fitbit watch app that syncs labels to Android over Bluetooth, with on-watch backup',
        'Moved labeling to a physical button for older adults',
        "Designing accessible input: speech, confirm-don't-recall",
        'Writing the v1 interaction spec before user trials',
      ],
      stack: ['Java', 'Android', 'Bluetooth', 'Figma'],
    },
    {
      id: 'we-staff', name: 'System Staff, CS Dept', subtitle: 'Operations student assistant', icon: 'server', now: true,
      summary: "Keeping the CS department's labs, displays and network running day to day",
      bullets: [
        'Run self-hosted Xibo signage across 4 displays',
        'Reimaged 40+ lab machines with FOG and Ventoy',
        'Helping deploy Palo Alto PA-410 firewalls',
        'Write troubleshooting docs so staff fix issues without escalating',
      ],
      stack: ['Docker', 'WSL2', 'Tailscale', 'Linux'],
    },
  ],
};

/* Slot 03 — Playground (placeholder) */
export const playground = {
  title: 'Playground',
  comingSoon: 'Coming soon', // not built yet: nothing to open, the cursor shows the under-construction pill
};

/* Slot 04 — Hero */
export const hero = {
  text: 'I design and build things that are fun to use and satisfying to press', // the sentence as plain text
  // "things" is a hammerable word: hit it and it drops to the bottom of the card, replaced by the next one
  before: 'I design and build',
  word: 'things',
  after: 'that are fun to use and satisfying to press',
  /** the cycle after "things" (loops). Colours are palette names (tokens.css). */
  words: [
    { text: 'web pages', color: 'sky' },
    { text: 'mobile apps', color: 'seafoam' },
    { text: 'wearables', color: 'lavender' },
    { text: 'tools', color: 'apricot' },
    { text: 'games', color: 'orchid' },
    { text: 'pixel art', color: 'lemon' },
  ] as { text: string; color: PaletteName }[],
  /** screen readers: the word button's description, and what's announced after a hit */
  hitHint: 'Hit it with the hammer to swap the word',
  announce: (w: string) => `I design and build ${w}`,
};

/* Slot 05 — Selected Projects */
export const projects = {
  title: 'Selected Projects',
  seeAll: { label: 'See all work', href: '/projects' },
  cursorLabel: 'View project', // custom cursor text over the preview + rows
  cycleMs: 3800,
  items: [
    {
      name: '1Up', slot: '1up-screenshot', image: '/projects/1up/hero.png', fit: 'contain', icon: 'footprints', href: '/projects/1up',
      outcome: 'A head-to-head running app that turns every run into a race against a friend.',
      tags: ['Product design', 'React Native', 'Garmin FIT SDK'],
    },
    {
      name: 'DatPone', slot: 'datpone-screenshot', image: '/projects/datpone/hero.webp', fit: 'contain',
      // three screens stacked as a triangle in the preview: top, bottom-left, bottom-right
      triangle: ['/projects/datpone/home-landing.webp', '/projects/datpone/home-login.webp', '/projects/datpone/home-setup.webp'], icon: 'camera', href: '/projects/datpone',
      outcome: 'A photobooth where any phone becomes the camera. Used by 320+ people across 5 events.',
      tags: ['Design system', 'WebRTC', 'Next.js'],
    },
  ],
};

/* Slot 07 — Currently Working Towards (running track) */
export type GoalStatus = 'upcoming' | 'in progress' | 'done';
export const goals: {
  title: string;
  items: { title: string; detail: string; status: GoalStatus; date?: string }[];
} = {
  title: 'Currently Working Towards',
  items: [
    // date can carry a start time (with its UTC offset) to count down to the start gun, not midnight
    { title: 'Run the NYC Half', detail: '', status: 'upcoming', date: '2027-03-21T07:30:00-04:00' },
    { title: 'Break 20:00 in the 5K', detail: 'current: 22:19', status: 'upcoming' },
    { title: 'Finishing this personal website', detail: 'in progress', status: 'in progress' },
    { title: '1Up development', detail: '', status: 'in progress' },
    { title: 'Shipped DatPone', detail: '320+ users', status: 'done' },
  ],
};

export const trackItems = [
  { lane: 4.62, d: 6, kind: 'marker', text: '400m' },
  { lane: 4.62, d: 126, kind: 'marker', text: '300m' },
  { lane: 4.62, d: 246, kind: 'marker', text: '200m' },
  { lane: 4.62, d: 366, kind: 'marker', text: '100m' },
  { lane: 0.5, d: 46, kind: 'icon', text: 'star', color: '#E8C21F' },
  { lane: 2.5, d: 92, kind: 'icon', text: 'footprint', color: '#4CB866' },
  { lane: 1.5, d: 168, kind: 'icon', text: 'bolt', color: '#9C7CF0' },
  { lane: 3.5, d: 214, kind: 'icon', text: 'water_drop', color: '#3BA9E0' },
  { lane: 0.5, d: 292, kind: 'icon', text: 'favorite', color: '#E46DC6' },
  { lane: 2.5, d: 338, kind: 'icon', text: 'local_fire_department', color: '#F2795F' },
  { lane: 1.5, d: 410, kind: 'icon', text: 'sprint', color: '#F29C4C' },
  { lane: 3.5, d: 446, kind: 'icon', text: 'flag', color: 'var(--accent-ink)' },
] as const;

/* Slot 08 — Socials: copy-email chip + brand keys (see SOCIALS_HANDOFF.md) */
export const socials = {
  email: 'owenleeling@gmail.com',
  copiedLabel: 'Copied',
  copiedAnnounce: 'Email copied',
  stampMs: 1600,
  links: [
    {
      label: 'GitHub', icon: 'github', href: 'https://github.com/youl1ng',
      fill: 'var(--github)', edge: 'var(--github-edge)', cursorLabel: 'Check out my projects',
    },
    {
      label: 'LinkedIn', icon: 'linkedin', href: 'https://www.linkedin.com/in/bone-oo/',
      fill: 'var(--linkedin)', edge: 'var(--linkedin-edge)', cursorLabel: 'Connect with me',
    },
  ],
};
