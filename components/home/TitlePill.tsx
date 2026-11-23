import type { ReactNode } from 'react';
import styles from './TitlePill.module.css';

export { styles as pillStyles };

/** Card label: a real <h2> styled like a highlighter line. */
export default function TitlePill({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <h2 id={id} className={className ? `${styles.pill} ${className}` : styles.pill}>
      {children}
    </h2>
  );
}
