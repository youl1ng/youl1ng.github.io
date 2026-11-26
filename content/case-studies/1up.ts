// 1Up case study: all copy & data. Edit here, not in components.
// Text in [square brackets] is a placeholder (screenshot to add, number to fill in).

import type { Media } from './types';
export type { Media };

export const caseStudy = {
  slug: '1up',
  title: '1Up',
  eyebrow: 'Project · 2026',
  tagline: 'A tiny rivalry app that lets a Garmin runner and a Coros runner compare every run, side by side.',
  hero: { alt: '1Up app screens: compare, weekly mileage, pace duel, splits, heart rate and route replay', src: '/projects/1up/hero.png', aspect: '1403 / 809', scale: 0.5 } as Media,
  // A link with no href is "coming soon": not clickable, and the cursor shows the under-construction pill.
  // Add the href when it's ready and it becomes a normal link.
  links: [], // none for now; add { label, href } entries here and they appear under the tagline
  comingSoon: 'Coming soon',
  meta: [
    { term: 'Role', value: 'Product designer + developer (solo)' },
    { term: 'Timeline', value: 'November 2026' },
    { term: 'Team', value: 'Me + [friend] as test runner' },
    { term: 'Tools', value: 'Claude Design, React Native / Expo, Garmin FIT SDK, Claude Code' },
  ],
  tldr: [
    { label: 'Problem', text: "My friend and I race each other on every run, but his Coros and my Garmin don't talk to each other." },
    { label: 'What I did', text: 'Designed and built a 4-tab app that reads raw watch files and puts both runners on one screen.' },
    { label: 'Result', text: 'A working app demo that compares real runs from both runner\'s watches.' },
  ],

  problem: {
    id: 'problem',
    title: "Garmin and Coros runners can't compare runs",
    body: [
      'After every interval session, my friend and I traded screenshots to see who ran faster. He wears a Coros, I wear a Garmin, and each app only shows its own runner. Comparing splits meant flipping between two phones and doing math in our heads.',
      'We wanted something small that cared only about the numbers.',
    ],
    media: { alt: '[Garmin Connect and Coros app screenshots side by side]', caption: 'Same workout, two apps, zero overlap.', height: 460 } as Media,
  },

  decisions: {
    id: 'decisions',
    title: 'Three decisions that shaped it',
    items: [
      {
        title: 'Compare every run, not just matching workouts',
        body: "We don't always run the same sessions, so matching workouts would leave most runs out. There's a feed tab where every recorded run lands for both friends to see.",
        media: { alt: 'Two selected runs, an easy loop and a long run, with a Compare 2 runs button', src: '/projects/1up/decision-1.png', aspect: '789 / 554', scale: 0.7, caption: 'One feed for both runners. Pick any two runs to compare.' } as Media,
      },
      {
        title: 'Each runner owns a color',
        body: "Each runner gets their own color on every chart, row and badge. You can tell who's ahead before you read a single number.",
        media: { alt: 'Pace overlaid chart with a blue line for Owen and a red line for Derrick, plus a mile-by-mile table of who is ahead', src: '/projects/1up/decision-2.png', aspect: '406 / 758', scale: 0.42, caption: 'One color per runner. You see the lead before you read it.' } as Media,
        // shown beside `media`, same size
        extra: { alt: 'Heart rate overlaid chart with a blue line for Owen and a red line for Derrick, plus a mile-by-mile table of who is working harder', src: '/projects/1up/decision-2b.png', aspect: '406 / 758', scale: 0.42 } as Media,
      },
      {
        title: 'Making different watch brands speak one language',
        body: "Garmin and Coros both export the original .FIT file the watch recorded. Parsing it directly gave me laps, heart rate and cadence from both brands in one format. Metrics a watch didn't record show a dash instead of a fake zero.",
        media: { alt: 'Import preview of a Garmin file and a Coros file listing the metrics found, merging into one 1Up run', src: '/projects/1up/decision-3.png', aspect: '828 / 806', scale: 0.7, caption: 'Two brands in, one data model out.' } as Media,
      },
    ],
  },

  outcome: {
    id: 'outcome',
    title: 'Four tabs, one rivalry',
    tabs: [
      { name: 'Feed', text: "Both runners' runs in one stream.", media: { alt: "Feed tab: a feed of both runners' runs, each with a vs button", src: '/projects/1up/tab-feed.png' } as Media },
      { name: 'Compare', text: 'The versus view, with a table of deltas and overlaid charts.', media: { alt: "Compare tab: overlaid pace chart and a table of per-mile deltas", src: '/projects/1up/tab-compare.png' } as Media },
      { name: 'Plan', text: 'The training schedule.', media: { alt: "Plan tab: this week's mileage, today's long run and upcoming days", src: '/projects/1up/tab-plan.png' } as Media },
      { name: 'You', text: 'Your own stats at a glance, like VO2 max.', media: { alt: "You tab: Owen's VO2 max, head-to-head mileage, resting heart rate and 5K PR", src: '/projects/1up/tab-you.png' } as Media },
    ],
  },

  reflection: {
    id: 'reflection',
    title: 'What I learned',
    items: [
      { lead: 'Design the system before the screens.', text: 'Locking type, icons and the two athlete colors first made every screen after that fast.' },
      { lead: 'Cutting features is a design decision.', text: 'Leaving out scoring and streaks felt like losing the fun part, but it let the comparison itself get good first.' },
    ],
  },

  next: {
    id: 'next',
    title: 'Continued development',
    intro: "I want to keep making 1Up better, improving the design and the experience first, then adding new features one at a time.",
    items: [
      { title: 'The competition layer', text: 'Weekly head-to-heads on runs and mileage, running streaks, and an all-time record of weeks won.' },
      { title: 'Live sync', text: 'Runs show up as soon as each watch syncs to the phone, with no manual file imports.' },
      { title: 'iPhone widgets', text: "Your rival's latest run on your home screen." },
      { title: 'A real native app', text: 'The demo runs as a web app in an iPhone frame. Next is shipping it to our actual phones.' },
    ],
  },

  footer: {
    back: { label: '← All work', href: '/projects' },
    next: { label: 'Next project →', href: '/projects/datpone' },
  },
};

/** "On this page" contents, in page order. */
export const caseStudyToc = [
  { id: caseStudy.problem.id, label: 'Problem' },
  { id: caseStudy.decisions.id, label: 'Decisions' },
  { id: caseStudy.outcome.id, label: 'Outcome' },
  { id: caseStudy.reflection.id, label: 'Reflection' },
  { id: caseStudy.next.id, label: 'Next' },
];
