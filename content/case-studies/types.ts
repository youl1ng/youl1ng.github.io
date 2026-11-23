// Shared shapes for case-study content files (1up.ts, datpone.ts, …).

export type Media = {
  alt: string;
  caption?: string;
  height?: number;
  aspect?: string;
  src?: string;
  bg?: string;
  scale?: number; /* 0-1: width as a fraction of the column, centered */
  /** Videos (src ending .mp4/.webm): playback speed, e.g. 0.75 plays a 15s clip in 20s. */
  rate?: number;
};

/** The parts every case study has: hero, intro, TL;DR and footer (rendered by CaseStudyShell). */
export type CaseStudyBase = {
  title: string;
  eyebrow: string;
  tagline: string;
  hero: Media;
  /** A link with no href is "coming soon": not clickable, the cursor shows the under-construction pill. */
  links: { label: string; href: string }[];
  comingSoon: string;
  meta: { term: string; value: string }[];
  tldr: { label: string; text: string }[];
  footer: { back: { label: string; href: string }; next: { label: string; href: string } };
};

export type TocItem = { id: string; label: string };
