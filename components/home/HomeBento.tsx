import styles from './HomeBento.module.css';
import Nav from './Nav';
import NameCard from './NameCard';
import WorkExperience from './WorkExperience';
import Playground from './Playground';
import Hero from './Hero';
import SelectedProjects from './SelectedProjects';
import GoalsTrack from './GoalsTrack';
import Socials from './Socials';

export default function HomeBento() {
  return (
    <div className={styles.root}>
      <Nav />
      <div className={styles.spacer} aria-hidden="true" />

      <main className={styles.grid}>
        <div className={`${styles.col} ${styles.colA}`} data-col="a">
          <NameCard />
          <WorkExperience />
          <Playground />
        </div>
        <div className={`${styles.col} ${styles.colB}`}>
          <Hero />
          <SelectedProjects />
        </div>
        <div className={`${styles.col} ${styles.colC}`}>
          <GoalsTrack />
          <Socials />
        </div>
      </main>
    </div>
  );
}
