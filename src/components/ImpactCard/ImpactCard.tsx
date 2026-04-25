'use client';

import type { ScoutResult, TrustLevel } from '@/hooks/useScout';
import { formatTxHashDisplay } from '@/lib/formatTxHash';
import styles from './ImpactCard.module.css';

interface Props {
  result: ScoutResult | null;
  address: string;
  isLoading?: boolean;
}

function SkeletonValue({ wide }: { wide?: boolean }) {
  return (
    <span
      className={
        wide
          ? `${styles.skeletonValue} ${styles.skeletonValueWide}`
          : styles.skeletonValue
      }
      aria-hidden="true"
    />
  );
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

export function ImpactCard({ result, address, isLoading = false }: Props) {
  const loading = isLoading || !result;
  const trustLevel = result?.trustLevel;
  const hasAuraActivity =
    result?.auraStats && result.auraStats.tipsReceived > 0;

  return (
    <article
      className={`${styles.card}${trustLevel ? ` ${styles[`trust${trustLevel}`]}` : ''}`}
      aria-label="Wallet impact card"
      aria-busy={loading}
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
          {loading ? (
            <span className={styles.skeletonBadge} aria-hidden="true" />
          ) : (
            <>
              <span
                className={`${styles.badge} ${styles[`badge${trustLevel!}`]}`}
              >
                {TRUST_LABELS[trustLevel!]}
              </span>
              {result!.isBuilder && (
                <span
                  className={styles.builderBadge}
                  aria-label="Contract deployer"
                >
                  ⬡ Builder
                </span>
              )}
            </>
          )}
        </div>
        <p className={styles.address} title={address}>
          {formatTxHashDisplay(address)}
        </p>
      </header>

      {/* Trust meter */}
      <div className={styles.meterWrapper} aria-hidden="true">
        <div className={styles.meterTrack}>
          <div
            className={`${styles.meterFill} ${loading ? styles.meterFillPending : METER_CLASS[trustLevel!]}`}
          />
        </div>
      </div>

      {/* Headline */}
      <p className={styles.headline}>
        {loading ? <SkeletonValue wide /> : result!.headline}
      </p>

      {/* Unified stats grid */}
      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>Transactions</dt>
          <dd>
            {loading ? (
              <SkeletonValue />
            ) : (
              result!.stats.txCount.toLocaleString()
            )}
          </dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>Wallet Age</dt>
          <dd>
            {loading ? <SkeletonValue /> : formatDate(result!.stats.walletAge)}
          </dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>Last Active</dt>
          <dd>
            {loading ? <SkeletonValue /> : formatDate(result!.stats.lastActive)}
          </dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>Vol. Sent</dt>
          <dd>
            {loading ? <SkeletonValue /> : `$${result!.stats.stablecoinVolume}`}
          </dd>
        </div>

        {!loading && result!.auraStats && (
          <>
            <div className={styles.statSeparator} aria-hidden="true" />
            <div className={styles.stat}>
              <dt className={`${styles.statLabel} ${styles.auraLabel}`}>
                Tips Received
              </dt>
              <dd
                className={hasAuraActivity ? styles.auraHighlight : undefined}
              >
                {result!.auraStats.tipsReceived}
              </dd>
            </div>
            <div className={styles.stat}>
              <dt className={`${styles.statLabel} ${styles.auraLabel}`}>
                Tips Sent
              </dt>
              <dd>{result!.auraStats.tipsSent}</dd>
            </div>
            <div className={styles.stat}>
              <dt className={`${styles.statLabel} ${styles.auraLabel}`}>
                Unique Tippers
              </dt>
              <dd>{result!.auraStats.uniqueTippers}</dd>
            </div>
            <div className={styles.stat}>
              <dt className={`${styles.statLabel} ${styles.auraLabel}`}>
                Vol. Received
              </dt>
              <dd>${result!.auraStats.totalVolumeReceived}</dd>
            </div>
          </>
        )}
      </dl>
    </article>
  );
}
