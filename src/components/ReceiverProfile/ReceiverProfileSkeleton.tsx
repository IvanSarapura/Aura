import styles from './ReceiverProfileSkeleton.module.css';

export function ReceiverProfileSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={`${styles.block} ${styles.impact}`} />
      <div className={`${styles.block} ${styles.payment}`} />
      <div className={`${styles.block} ${styles.feed}`} />
    </div>
  );
}
