'use client';

import { useAccount } from 'wagmi';
import { getExplorerUrl } from '@/config/chains';
import type { TipPhase } from '@/hooks/useAuraTip';
import styles from './TxStatus.module.css';

interface Props {
  phase: TipPhase;
  approveTxHash?: string;
  tipTxHash?: string;
  errorMsg?: string;
}

export function TxStatus({ phase, approveTxHash, tipTxHash, errorMsg }: Props) {
  const { chainId } = useAccount();

  if (phase === 'idle') return null;

  const explorerLink = (hash: string) =>
    chainId ? getExplorerUrl(chainId, hash) : `#${hash}`;

  return (
    <div
      className={`${styles.container} ${styles[phase]}`}
      role="status"
      aria-live="polite"
    >
      {phase === 'approving' && (
        <>
          <span className={styles.spinner} aria-hidden />
          <span>Waiting for approval confirmation…</span>
          {approveTxHash && (
            <a
              href={explorerLink(approveTxHash)}
              target="_blank"
              rel="noreferrer"
              className={styles.link}
            >
              View tx
            </a>
          )}
        </>
      )}

      {phase === 'tipping' && (
        <>
          <span className={styles.spinner} aria-hidden />
          <span>Sending tip on-chain…</span>
          {tipTxHash && (
            <a
              href={explorerLink(tipTxHash)}
              target="_blank"
              rel="noreferrer"
              className={styles.link}
            >
              View tx
            </a>
          )}
        </>
      )}

      {phase === 'success' && (
        <>
          <span className={styles.checkmark} aria-hidden>
            ✓
          </span>
          <span>Tip confirmed!</span>
          {tipTxHash && (
            <a
              href={explorerLink(tipTxHash)}
              target="_blank"
              rel="noreferrer"
              className={styles.link}
            >
              View on explorer
            </a>
          )}
        </>
      )}

      {phase === 'error' && errorMsg && (
        <>
          <span className={styles.errorIcon} aria-hidden>
            ✕
          </span>
          <span>{errorMsg}</span>
        </>
      )}
    </div>
  );
}
