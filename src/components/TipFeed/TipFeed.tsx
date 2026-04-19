'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import type { Address } from 'viem';
import { useTips, type TipEvent } from '@/hooks/useTips';
import { formatTxHashDisplay } from '@/lib/formatTxHash';
import styles from './TipFeed.module.css';

interface Props {
  address: Address;
  type?: 'received' | 'sent';
  title?: string;
  viewAllHref?: string;
  /** Right side of the section header (e.g. Back on full tips page). Uses same style as View all. */
  headerTrailing?: { href: string; label: string };
  /** Full `/[address]/tips` experience: load all pages, no Load more, filter shell above title. */
  tipsFullPage?: boolean;
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

function TipItem({ tip, type }: { tip: TipEvent; type: 'received' | 'sent' }) {
  const peer = type === 'received' ? tip.from : tip.to;
  const peerLabel = type === 'received' ? 'from' : 'to';
  const hasMessage = tip.message.trim() !== '';

  return (
    <li className={styles.item}>
      <div className={styles.itemTop}>
        <span className={styles.amountGroup}>
          <span className={styles.amount}>{tip.amount}</span>
          <span className={styles.tokenSymbol}>{tip.tokenSymbol}</span>
        </span>
        <span className={styles.date}>{formatDate(tip.timestamp)}</span>
      </div>

      <div className={styles.itemSub}>
        <span className={styles.from} title={peer}>
          {peerLabel} {formatTxHashDisplay(peer)}
        </span>
        <span className={styles.category}>{tip.category}</span>
      </div>

      {hasMessage && (
        <p className={styles.message} title={tip.message}>
          &ldquo;{tip.message}&rdquo;
        </p>
      )}
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

export function TipFeed({
  address,
  type = 'received',
  title,
  viewAllHref,
  headerTrailing,
  tipsFullPage = false,
}: Props) {
  const {
    data,
    isPending,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useTips(address, type);

  useEffect(() => {
    if (!tipsFullPage || isPending || isError) return;
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [
    tipsFullPage,
    isPending,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  // Deduplicate by txHash — offset pagination drifts when new tips are added
  // between a page-1 refetch and a subsequent "Load more" call.
  const seen = new Set<string>();
  const tips = (data?.pages.flatMap((p) => p.tips) ?? []).filter((tip) => {
    if (seen.has(tip.txHash)) return false;
    seen.add(tip.txHash);
    return true;
  });
  const total = data?.pages[0]?.total ?? 0;

  const sectionTitle =
    title ?? (type === 'received' ? 'Tips received' : 'Tips sent');

  return (
    <section className={styles.section} aria-label={sectionTitle}>
      {tipsFullPage && (
        <div
          className={styles.filterBar}
          role="region"
          aria-label="Tip filters (preview — not active yet)"
          title="Filters coming soon"
        >
          <span className={styles.filterLabel}>Filter</span>
          <span className={styles.filterMock}>
            <span className={styles.filterMockValue}>All tips</span>
            <span className={styles.filterChevron} aria-hidden>
              ▾
            </span>
          </span>
        </div>
      )}

      <div className={styles.header}>
        <h2 className={styles.title}>{sectionTitle}</h2>
        {headerTrailing ? (
          <Link
            href={headerTrailing.href}
            className={styles.viewAll}
            scroll
            aria-label="Back to profile"
          >
            {headerTrailing.label}
          </Link>
        ) : (
          !isPending &&
          !isError &&
          total > 0 &&
          viewAllHref && (
            <Link href={viewAllHref} className={styles.viewAll} scroll>
              View all
            </Link>
          )
        )}
      </div>

      {isPending && <SkeletonList />}

      {isError && (
        <div className={styles.errorState}>
          <p>Could not load tips — network or indexer unavailable.</p>
          <button className={styles.retryBtn} onClick={() => void refetch()}>
            Retry
          </button>
        </div>
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
        <>
          <ul className={styles.list} aria-label={`${sectionTitle} list`}>
            {tips.map((tip) => (
              <TipItem key={tip.txHash} tip={tip} type={type} />
            ))}
          </ul>

          {hasNextPage && !tipsFullPage && (
            <button
              className={styles.loadMore}
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              aria-label="Load more tips"
            >
              {isFetchingNextPage ? 'Loading…' : 'Load more'}
            </button>
          )}
        </>
      )}
    </section>
  );
}
