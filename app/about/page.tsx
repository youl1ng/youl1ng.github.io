import type { Metadata } from 'next';
import Nav from '@/components/home/Nav';
import UnderConstructionFooter from '@/components/UnderConstructionFooter';
import { site } from '@/content/home';
import s from '@/components/projects/ProjectsPage.module.css';

export const metadata: Metadata = {
  title: `About — ${site.name}`,
};

/** About: not written yet. Nav + the shared "under construction" panel, on the standard page wrapper. */
export default function AboutPage() {
  return (
    <div className={s.page}>
      <Nav />
      <div className={s.navGap} aria-hidden="true" />
      <main className={s.wrap}>
        <h1 className="visually-hidden">About</h1>
        <UnderConstructionFooter />
      </main>
    </div>
  );
}
