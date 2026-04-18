import styles from './AuraLoader.module.css';

interface Props {
  inline?: boolean;
}

export function AuraLoader({ inline = false }: Props) {
  return (
    <div
      className={`${styles.container} ${inline ? styles.inline : styles.fullpage}`}
      aria-label="Loading"
      aria-live="polite"
    >
      <span className={styles.symbol} aria-hidden="true">
        ✦
      </span>
      <span className={styles.label} aria-hidden="true">
        Aura
      </span>
    </div>
  );
}
