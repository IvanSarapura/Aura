'use client';

import type { ScoutResult, TrustLevel } from '@/hooks/useScout';
import styles from './ImpactCard.module.css';

interface Props {
  result: ScoutResult;
  address: string;
}

const TRUST_LABELS: Record<TrustLevel, string> = {
  Low: 'Low Trust',
  Medium: 'Medium Trust',
  High: 'High Trust',
};

const METER_CLASS: Record<TrustLevel, string> = {
  Low: styles.meterFillLow,
  Medium: styles.meterFillMedium,
  High: styles.meterFillHigh,
};

const STAT_ICONS = {
  txCount: '🔗',
  usdmVolume: '💸',
  lastActive: '📅',
  walletAge: '⏳',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function ImpactCard({ result, address }: Props) {
  const { trustLevel, headline, tags, isBuilder, stats, auraStats } = result;
  const hasAuraActivity = auraStats && auraStats.tipsReceived > 0;

  return (
    <article
      className={`${styles.card} ${styles[`trust${trustLevel}`]}`}
      aria-label="Wallet impact card"
    >
      {/* Header: badges */}
      <header className={styles.header}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <span className={`${styles.badge} ${styles[`badge${trustLevel}`]}`}>
            {TRUST_LABELS[trustLevel]}
          </span>
          {isBuilder && (
            <span
              className={styles.builderBadge}
              aria-label="Contract deployer"
            >
              ⬡ Builder
            </span>
          )}
        </div>
        <p className={styles.address}>
          {address.slice(0, 6)}…{address.slice(-4)}
        </p>
      </header>

      {/* Trust meter */}
      <div className={styles.meterWrapper} aria-hidden="true">
        <div className={styles.meterTrack}>
          <div className={`${styles.meterFill} ${METER_CLASS[trustLevel]}`} />
        </div>
      </div>

      {/* Headline */}
      <p className={styles.headline}>{headline}</p>

      {/* Tags */}
      <ul className={styles.tags} aria-label="Wallet tags">
        {tags.map((tag) => (
          <li key={tag} className={styles.tag}>
            {tag}
          </li>
        ))}
      </ul>

      {/* On-chain stats */}
      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>
            <span className={styles.statIcon} aria-hidden>
              {STAT_ICONS.txCount}
            </span>
            Transactions
          </dt>
          <dd>{stats.txCount.toLocaleString()}</dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>
            <span className={styles.statIcon} aria-hidden>
              {STAT_ICONS.usdmVolume}
            </span>
            Volume
          </dt>
          <dd>${stats.usdmVolume}</dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>
            <span className={styles.statIcon} aria-hidden>
              {STAT_ICONS.lastActive}
            </span>
            Last Active
          </dt>
          <dd>{formatDate(stats.lastActive)}</dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>
            <span className={styles.statIcon} aria-hidden>
              {STAT_ICONS.walletAge}
            </span>
            Wallet Age
          </dt>
          <dd>{formatDate(stats.walletAge)}</dd>
        </div>
      </dl>

      {/* Aura Activity */}
      <section
        className={styles.auraSection}
        aria-label="Aura platform activity"
      >
        <h3 className={styles.auraSectionTitle}>✦ Aura Activity</h3>
        {auraStats ? (
          <>
            <dl className={styles.auraStats}>
              <div className={styles.stat}>
                <dt className={styles.statLabel}>Tips Received</dt>
                <dd
                  className={hasAuraActivity ? styles.auraHighlight : undefined}
                >
                  {auraStats.tipsReceived}
                </dd>
              </div>
              <div className={styles.stat}>
                <dt className={styles.statLabel}>Tips Sent</dt>
                <dd>{auraStats.tipsSent}</dd>
              </div>
              <div className={styles.stat}>
                <dt className={styles.statLabel}>Unique Tippers</dt>
                <dd>{auraStats.uniqueTippers}</dd>
              </div>
              <div className={styles.stat}>
                <dt className={styles.statLabel}>Vol. Received</dt>
                <dd>${auraStats.totalVolumeReceived}</dd>
              </div>
            </dl>
            {auraStats.topCategories.length > 0 && (
              <div className={styles.categories}>
                <span className={styles.categoriesLabel}>Top categories</span>
                <ul
                  className={styles.categoryList}
                  aria-label="Top tip categories"
                >
                  {auraStats.topCategories.map((cat) => (
                    <li key={cat} className={styles.category}>
                      {cat}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className={styles.auraEmpty}>No Aura activity yet</p>
        )}
      </section>
    </article>
  );
}
