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

function formatDate(iso: string): string {
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
  const { trustLevel, headline, tags, stats } = result;

  return (
    <article
      className={`${styles.card} ${styles[`trust${trustLevel}`]}`}
      aria-label="Wallet impact card"
    >
      <header className={styles.header}>
        <span className={`${styles.badge} ${styles[`badge${trustLevel}`]}`}>
          {TRUST_LABELS[trustLevel]}
        </span>
        <p className={styles.address}>
          {address.slice(0, 6)}…{address.slice(-4)}
        </p>
      </header>

      <p className={styles.headline}>{headline}</p>

      <ul className={styles.tags} aria-label="Wallet tags">
        {tags.map((tag) => (
          <li key={tag} className={styles.tag}>
            {tag}
          </li>
        ))}
      </ul>

      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>Transactions</dt>
          <dd>{stats.txCount.toLocaleString()}</dd>
        </div>
        <div className={styles.stat}>
          <dt>USDm Volume</dt>
          <dd>${stats.usdmVolume}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Last Active</dt>
          <dd>{formatDate(stats.lastActive)}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Wallet Age</dt>
          <dd>{formatDate(stats.walletAge)}</dd>
        </div>
      </dl>
    </article>
  );
}
