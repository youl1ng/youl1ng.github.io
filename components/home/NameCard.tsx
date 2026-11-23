import Card from './Card';
import PixelName from './PixelName';
import TagMarquee from './TagMarquee';
import styles from './NameCard.module.css';
import { nameCard, myThing } from '@/content/home';

/** Slot 01: pixel name card on top, "what's MY thing?" + tag marquee below. */
export default function NameCard() {
  return (
    <Card className={styles.card} aria-labelledby="mything-title" data-slot="name" data-area="name">
      <div className={styles.golden}>
        <div className={styles.blue}>
          <PixelName />
          <p className={styles.caption}>
            <span>{nameCard.caption}</span>
          </p>
        </div>
      </div>
      <div className={styles.divider} aria-hidden="true" />
      <div className={styles.thing}>
        <h2 id="mything-title" className={styles.heading}>
          <span className={styles.italic}>{myThing.headingItalic}</span>
          <span className={styles.plain}>
            <span className={styles.bold}>{myThing.headingBold}</span> {myThing.headingRest}
          </span>
        </h2>
        <TagMarquee />
      </div>
    </Card>
  );
}
