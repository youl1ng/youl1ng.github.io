import Card from './Card';
import TitlePill from './TitlePill';
import { ArrowNE } from '@/components/icons/Glyphs';
import styles from './Playground.module.css';
import { playground } from '@/content/home';

// PLACEHOLDER card: title + arrow only. Not built yet, so nothing links anywhere: hovering the arrow shows the
// hazard-striped "Coming soon" pill. Once it exists, make the arrow a link again and drop the cursor attributes.
export default function Playground() {
  return (
    <Card
      className={styles.play}
      aria-labelledby="play-title"
      data-area="playground"
    >
      <div className={styles.row}>
        <TitlePill id="play-title">{playground.title}</TitlePill>
        {/* not a link: nothing to open yet. Hovering the arrow shows the "Coming soon" pill */}
        <span
          className={styles.btn}
          role="img"
          aria-label={`${playground.title} (${playground.comingSoon.toLowerCase()})`}
          data-cursor-label={playground.comingSoon}
          data-cursor-label-variant="hazard"
        >
          <ArrowNE size={14} />
        </span>
      </div>
    </Card>
  );
}
