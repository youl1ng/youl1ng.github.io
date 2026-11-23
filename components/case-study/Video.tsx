'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Case-study clip: muted, looping, inline autoplay (like a GIF), at `rate` speed.
 * With reduced motion it doesn't autoplay; it shows controls so the reader can choose to play it.
 */
export default function Video({
  src,
  label,
  rate = 1,
  className,
  style,
}: {
  src: string;
  label: string;
  rate?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReduced(isReduced);
    // playbackRate resets when a new source loads, so set it on load as well as now
    const applyRate = () => (v.playbackRate = rate);
    applyRate();
    v.addEventListener('loadedmetadata', applyRate);
    if (isReduced) v.pause();
    else v.play().catch(() => {});
    return () => v.removeEventListener('loadedmetadata', applyRate);
  }, [rate]);

  return (
    <video
      ref={ref}
      className={className}
      style={style}
      src={src}
      aria-label={label}
      muted
      loop
      playsInline
      autoPlay={!reduced}
      controls={reduced}
      preload="metadata"
      draggable={false}
    />
  );
}
