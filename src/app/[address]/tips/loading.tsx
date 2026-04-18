import styles from '../address.module.css';
import tipsStyles from './tips.module.css';
import feedStyles from '@/components/TipFeed/TipFeed.module.css';

export default function TipsLoading() {
  return (
    <main className={styles.main}>
      <header className={styles.topbar}>
        <span className={styles.logo}>✦Aura</span>
      </header>

      <div className={styles.body}>
        <div className={tipsStyles.wrapper}>
          <div className={tipsStyles.nav}>
            <div
              className={styles.skeletonSubtitle}
              style={{ width: '4rem' }}
            />
          </div>

          <div className={feedStyles.skeleton} aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={feedStyles.skeletonItem} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
