import styles from './address.module.css';

export default function AddressLoading() {
  return (
    <main className={styles.main}>
      <header className={styles.topbar}>
        <span className={styles.logo}>✦Aura</span>
      </header>
      <div className={styles.body}>
        <div className={styles.skeleton}>
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonSubtitle} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} style={{ height: '5rem' }} />
        </div>
      </div>
    </main>
  );
}
