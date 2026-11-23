import type { Media as MediaData } from '@/content/case-studies/1up';
import Video from './Video';
import s from './CaseStudy.module.css';

/**
 * A case-study image or video slot (src ending .mp4/.webm plays as a looping clip).
 * Until `src` is set it renders a labelled grey placeholder
 * ("[Feed tab screen]") at the planned size, so the layout is final before the screenshots exist.
 */
export default function Media({
  media,
  className,
  bordered,
  vtName,
}: {
  media: MediaData;
  className?: string;
  bordered?: boolean;
  /** page transitions: a view-transition-name for the picture itself (e.g. the hero, so a clicked project morphs into it) */
  vtName?: string;
}) {
  const style = { height: media.height, aspectRatio: media.aspect, background: media.bg, viewTransitionName: vtName } as React.CSSProperties;
  return (
    <figure
      className={`${s.figure} ${className ?? ''}`}
      style={media.scale ? { width: `${media.scale * 100}%`, marginInline: 'auto' } : undefined}
    >
      {media.src && /\.(mp4|webm)$/i.test(media.src) ? (
        <Video className={s.img} src={media.src} label={media.alt} rate={media.rate} style={style} />
      ) : media.src ? (
        // plain <img>: the site is a static export, so next/image wouldn't optimize anything here
        <img className={s.img} src={media.src} alt={media.alt} style={style} draggable={false} />
      ) : (
        <div className={`${s.ph} ${bordered ? s.phBordered : ''}`} role="img" aria-label={media.alt} style={style}>
          <span>{media.alt}</span>
        </div>
      )}
      {media.caption && <figcaption className={s.cap}>{media.caption}</figcaption>}
    </figure>
  );
}
