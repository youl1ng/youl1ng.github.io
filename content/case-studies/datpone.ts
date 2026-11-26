// DatPone case study: all copy & data. Edit here, not in components.
// Text in [square brackets] is a placeholder (screenshot to add, link to fill in).
// _Underscores_ around a word make it italic.

import type { CaseStudyBase, Media, TocItem } from './types';

export const datpone = {
  slug: 'datpone',
  title: 'DatPone',
  eyebrow: 'Project · 2026',
  tagline: 'A photobooth that runs in your browser, for hanging out at home or running a line at a club event.',
  hero: {
    alt: 'DatPone screens: the landing page with the floating camera, the "welcome back" login card, and kiosk setup with the phone QR code',
    src: '/projects/datpone/hero.webp',
    aspect: '2400 / 830',
  } as Media,
  links: [], // none for now; add { label, href } entries here and they appear under the tagline
  comingSoon: 'Coming soon',
  meta: [
    { term: 'Role', value: 'Product designer + developer (solo)' },
    { term: 'Timeline', value: 'Aug 2026' },
    { term: 'Team', value: 'Solo' },
    { term: 'Tools', value: 'Next.js, Supabase, Resend, Framer Motion, Figma' },
  ],
  tldr: [
    { label: 'Problem', text: 'Our culture club wanted a photobooth at events, and I wanted one at home.' },
    { label: 'What I did', text: 'Designed and built a browser photobooth with two modes, where your phone becomes the camera.' },
    { label: 'Result', text: 'Used by 320+ attendees across 5 live events.' },
  ],

  problem: {
    id: 'problem',
    title: 'Photobooths are fun, but hard to bring anywhere',
    body: [
      'BURSA, my Burmese culture club, wanted a photobooth for our events, but renting one takes a lot of gear. I also wanted one to use with friends at home, so I built one that works for both. _DatPone_ means "photo" in Burmese.',
    ],
  },

  decisions: {
    id: 'decisions',
    title: 'Two decisions that shaped it',
    items: [
      {
        title: 'Your phone is the camera',
        body: 'Scan a QR code and your phone streams to the booth. No app to download, no extra gear.',
        media: {
          alt: 'The camera card on kiosk setup: a QR code to use your phone as the camera',
          src: '/projects/datpone/decision-1-card.webp',
          aspect: '485 / 836',
          scale: 0.5,
          caption: 'Scan the code on the booth screen and your phone becomes the camera.',
        } as Media,
      },
      {
        title: 'One app, two modes',
        body: 'Personal mode is for home: take your time, retake any shot. Kiosk mode is for events: one quick review screen, then the strip goes straight to your email so the line keeps moving.',
        media: {
          alt: 'The whole kiosk setup screen: camera card with the phone QR code and session card',
          src: '/projects/datpone/decision-2-setup.webp',
          aspect: '1160 / 1120',
          caption: 'Kiosk setup: pick the camera, shots, timer and template once, then guests just tap and shoot.',
        } as Media,
      },
    ] as { title: string; body: string; media?: Media }[],
  },

  outcome: {
    id: 'outcome',
    title: 'A retro booth that fits in a browser',
    body: [
      'The look borrows from old cameras and SD cards, down to an "insert card" login. You pick your settings, take your shots, and get a photostrip in your inbox.',
    ],
    media: {
      alt: 'Screen recording of one DatPone session, from the camera to the finished photostrip',
      src: '/projects/datpone/demo.mp4',
      aspect: '1440 / 900',
      rate: 0.75, // the 15s clip plays in 20s
      caption: 'One session, from camera to finished strip.',
    } as Media,
    closing: 'So far, 320+ attendees have used it across 5 live events.',
  },

  reflection: {
    id: 'reflection',
    title: 'What I learned',
    items: [
      {
        lead: 'Less motion feels more retro.',
        text: 'My first login animation had a dozen moving parts. Cutting it to three snappy beats made it feel more like a real machine.',
      },
      {
        lead: 'Events change the design.',
        text: "At home, people want time to retake their shots, but at an event they just want their strip and to keep the line moving. That's why the same booth needed two different flows.",
      },
    ],
  },

  footer: {
    back: { label: '← All work', href: '/projects' },
    next: { label: 'Next project →', href: '#' }, // TODO: next case study
  },
} satisfies CaseStudyBase & Record<string, unknown>;

/** "On this page" contents, in page order. */
export const datponeToc: TocItem[] = [
  { id: datpone.problem.id, label: 'Problem' },
  { id: datpone.decisions.id, label: 'Decisions' },
  { id: datpone.outcome.id, label: 'Outcome' },
  { id: datpone.reflection.id, label: 'Reflection' },
];
