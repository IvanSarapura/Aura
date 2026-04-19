'use client';

import type { TrustLevel } from '@/hooks/useScout';
import { useAccount } from 'wagmi';
import { getExplorerUrl } from '@/config/chains';
import { formatTxHashDisplay } from '@/lib/formatTxHash';
import styles from './ShareCard.module.css';

interface Props {
  recipient: string;
  amountDisplay: string;
  trustLevel?: TrustLevel;
  tipTxHash?: string;
  onReset: () => void;
}

const TRUST_EMOJI: Record<TrustLevel, string> = {
  High: '🟢',
  Medium: '🟡',
  Low: '🔴',
};

export function ShareCard({
  recipient,
  amountDisplay,
  trustLevel,
  tipTxHash,
  onReset,
}: Props) {
  const { chainId } = useAccount();
  const short = formatTxHashDisplay(recipient);
  const trust = trustLevel ?? 'Medium';
  const emoji = TRUST_EMOJI[trust];

  const shareText = encodeURIComponent(
    `I just sent ${amountDisplay} USDm to ${short} via @Auradapp on @Celo. Trust level: ${trust} ${emoji} 🌿 #Web3 #Celo`,
  );

  const farcasterUrl = `https://warpcast.com/~/compose?text=${shareText}`;
  const twitterUrl = `https://x.com/intent/tweet?text=${shareText}`;

  const isMiniPay =
    typeof window !== 'undefined' &&
    !!(window as Window & { ethereum?: { isMiniPay?: boolean } }).ethereum
      ?.isMiniPay;

  return (
    <div className={styles.card} role="status">
      <div className={styles.receipt}>
        <p className={styles.brand} aria-label="Aura Ticket">
          <span className={styles.brandSymbol} aria-hidden="true">
            ✦
          </span>
          <span className={styles.brandText}>Aura Ticket</span>
        </p>

        <div className={styles.divider} />

        <dl className={styles.stats}>
          <div className={styles.row}>
            <dt>Recipient</dt>
            <dd className={styles.mono}>{short}</dd>
          </div>
          <div className={styles.row}>
            <dt>Amount</dt>
            <dd className={styles.amount}>{amountDisplay} USDm</dd>
          </div>
          {trustLevel && (
            <div className={styles.row}>
              <dt>Trust</dt>
              <dd className={`${styles.trust} ${styles[`trust${trust}`]}`}>
                {emoji} {trust}
              </dd>
            </div>
          )}
          {tipTxHash && (
            <div className={styles.row}>
              <dt>Tx</dt>
              <dd>
                <a
                  href={chainId ? getExplorerUrl(chainId, tipTxHash) : '#'}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.link}
                  title={tipTxHash}
                >
                  {formatTxHashDisplay(tipTxHash)}
                </a>
              </dd>
            </div>
          )}
        </dl>

        <div className={styles.divider} />
        <p className={styles.footer}>
          <span className={styles.footerLabel}>Powered by</span>
          <span className={styles.footerBrand}>MiniPay · Celo</span>
        </p>
      </div>

      <div className={styles.actions}>
        <a
          href={farcasterUrl}
          target="_blank"
          rel="noreferrer"
          className={`${styles.shareBtn} ${styles.farcaster}`}
        >
          Share on Farcaster
        </a>
        <a
          href={twitterUrl}
          target="_blank"
          rel="noreferrer"
          className={`${styles.shareBtn} ${styles.twitter}`}
        >
          Share on X
        </a>

        {isMiniPay && (
          <a
            href="https://minipay.opera.com/add_cash"
            target="_blank"
            rel="noreferrer"
            className={`${styles.shareBtn} ${styles.addCash}`}
          >
            Add USDm in MiniPay
          </a>
        )}

        <button className={styles.resetBtn} type="button" onClick={onReset}>
          Send another tip
        </button>
      </div>
    </div>
  );
}
