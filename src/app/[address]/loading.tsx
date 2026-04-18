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
          {/* ImpactCard */}
          <div className={styles.skeletonCard} />
          {/* PaymentLink */}
          <div className={styles.skeletonCard} style={{ height: '3.5rem' }} />
          {/* TipFeed */}
          <div className={styles.skeletonCard} />
        </div>
      </div>
    </main>
  );
}
