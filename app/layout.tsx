import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { plexSans, plexCond, plexMono, fraunces } from './fonts';
import { site } from '@/content/home';
import CustomCursor from '@/components/cursor/CustomCursor';
import PageTransitions from '@/components/PageTransitions';
import './styles/tokens.css';
import './styles/globals.css';

// TODO(§11): description, OG image and favicon are still to come.
export const metadata: Metadata = {
  title: site.name,
  metadataBase: new URL(`https://${site.domain}`),
};

// Material Symbols Sharp, subset to the 8 track icons (names must stay alphabetical).
const SYMBOLS_HREF =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200' +
  '&icon_names=bolt,favorite,flag,footprint,local_fire_department,sprint,star,water_drop&display=block';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth" /* lets Next turn smooth scrolling off while it changes routes */
      className={`${plexSans.variable} ${plexCond.variable} ${plexMono.variable} ${fraunces.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={SYMBOLS_HREF} />
      </head>
      <body>
        {children}
        <CustomCursor />
        <PageTransitions />
      </body>
    </html>
  );
}
