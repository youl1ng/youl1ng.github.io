import type { ComponentPropsWithRef } from 'react';
import styles from './Card.module.css';

/** Bento card base: grey surface, 1px border, 14px radius. Padding is set per card. */
export default function Card({ className, ...rest }: ComponentPropsWithRef<'section'>) {
  return <section className={className ? `${styles.card} ${className}` : styles.card} {...rest} />;
}
