'use client';

import type {
  ScoutResult,
  ScoutFastResult,
  TrustLevel,
} from '@/hooks/useScout';
import { formatTxHashDisplay } from '@/lib/formatTxHash';
import styles from './ImpactCard.module.css';

interface Props {
  result: ScoutResult | null;
  fastResult?: ScoutFastResult | null;
  address: string;
  isLoading?: boolean;
  isLoadingFull?: boolean;
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

export function ImpactCard({
  result,
  fastResult,
  address,
  isLoading = false,
  isLoadingFull,
}: Props) {
  // Fast fields: use fastResult first, fall back to result.stats
  const fastData =
    fastResult ??
    (result ? { ...result.stats, isBuilder: result.isBuilder } : null);
  const loadingFast = isLoading && !fastData;
  // Full fields: slow data (stablecoinVolume, trustLevel, headline, auraStats)
  const loadingFull = isLoadingFull ?? (isLoading || !result);

  const trustLevel = result?.trustLevel;
  const hasAuraActivity =
    result?.auraStats && result.auraStats.tipsReceived > 0;

  return (
    <article
      className={`${styles.card}${trustLevel ? ` ${styles[`trust${trustLevel}`]}` : ''}`}
      aria-label="Wallet impact card"
      aria-busy={loadingFull}
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
          {loadingFull ? (
            <span className={styles.skeletonBadge} aria-hidden="true" />
          ) : (
            <span
              className={`${styles.badge} ${styles[`badge${trustLevel!}`]}`}
            >
              {TRUST_LABELS[trustLevel!]}
            </span>
          )}
          {/* Builder badge comes from fast data — shown as soon as fast result arrives */}
          {!loadingFast && fastData!.isBuilder && (
            <span
              className={styles.builderBadge}
              aria-label="Contract deployer"
            >
              ⬡ Builder
            </span>
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
            className={`${styles.meterFill} ${loadingFull ? styles.meterFillPending : METER_CLASS[trustLevel!]}`}
          />
        </div>
      </div>

      {/* Headline */}
      <p className={styles.headline}>
        {loadingFull ? <SkeletonValue wide /> : result!.headline}
      </p>

      {/* Unified stats grid */}
      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>Transactions</dt>
          <dd>
            {loadingFast ? (
              <SkeletonValue />
            ) : (
              fastData!.txCount.toLocaleString()
            )}
          </dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>Wallet Age</dt>
          <dd>
            {loadingFast ? <SkeletonValue /> : formatDate(fastData!.walletAge)}
          </dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>Last Active</dt>
          <dd>
            {loadingFast ? <SkeletonValue /> : formatDate(fastData!.lastActive)}
          </dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>Vol. Sent</dt>
          <dd>
            {loadingFull ? (
              <SkeletonValue />
            ) : (
              `$${result!.stats.stablecoinVolume}`
            )}
          </dd>
        </div>

        {!loadingFull && result!.auraStats && (
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
