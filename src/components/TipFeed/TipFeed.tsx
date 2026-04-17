'use client';

import type { Address } from 'viem';
import { useTips, type TipEvent } from '@/hooks/useTips';
import styles from './TipFeed.module.css';

interface Props {
  address: Address;
  type?: 'received' | 'sent';
  title?: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function TipItem({ tip, type }: { tip: TipEvent; type: 'received' | 'sent' }) {
  const peer = type === 'received' ? tip.from : tip.to;
  const peerLabel = type === 'received' ? 'from' : 'to';

  return (
    <li className={styles.item}>
      <div className={styles.itemTop}>
        <span>
          <span className={styles.amount}>{tip.amount}</span>
          <span className={styles.tokenSymbol}>{tip.tokenSymbol}</span>
        </span>
        <span className={styles.from}>
          {peerLabel} {shortenAddress(peer)}
        </span>
      </div>

      <div className={styles.itemMeta}>
        <span className={styles.category}>{tip.category}</span>
        {tip.message.trim() !== '' && (
          <span className={styles.message} title={tip.message}>
            &ldquo;{tip.message}&rdquo;
          </span>
        )}
        <span className={styles.date}>{formatDate(tip.timestamp)}</span>
      </div>
    </li>
  );
}

function SkeletonList() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.skeletonItem} />
      ))}
    </div>
  );
}

export function TipFeed({ address, type = 'received', title }: Props) {
  const { data, isPending, isError } = useTips(address, type);
  const tips = data?.tips ?? [];

  const sectionTitle =
    title ?? (type === 'received' ? 'Tips received' : 'Tips sent');

  return (
    <section className={styles.section} aria-label={sectionTitle}>
      <div className={styles.header}>
        <h2 className={styles.title}>{sectionTitle}</h2>
        {!isPending && !isError && tips.length > 0 && (
          <span className={styles.count} aria-label={`${tips.length} tips`}>
            {tips.length}
          </span>
        )}
      </div>

      {isPending && <SkeletonList />}

      {isError && (
        <p className={styles.errorState}>
          Could not load tips. Check back later.
        </p>
      )}

      {!isPending && !isError && tips.length === 0 && (
        <div className={styles.empty} role="status">
          <span className={styles.emptyIcon} aria-hidden>
            {type === 'received' ? '✦' : '↗'}
          </span>
          <p className={styles.emptyText}>
            {type === 'received'
              ? 'No tips received yet. Share your Aura link to get started.'
              : 'No tips sent yet.'}
          </p>
        </div>
      )}

      {!isPending && !isError && tips.length > 0 && (
        <ul className={styles.list} aria-label={`${sectionTitle} list`}>
          {tips.map((tip) => (
            <TipItem key={`${tip.txHash}-${tip.from}`} tip={tip} type={type} />
          ))}
        </ul>
      )}
    </section>
  );
}
