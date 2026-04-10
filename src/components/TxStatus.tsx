'use client';

import type { Chain } from 'viem/chains';
import { getExplorerTxUrl } from '@/config/chains';
import type { TxStatus as TxStatusType } from '@/hooks/useErc20Transfer';
import styles from './TxStatus.module.css';

interface TxStatusProps {
  status: TxStatusType;
  txHash?: `0x${string}`;
  chain?: Chain;
  error?: Error | null;
}

const STATUS_MESSAGES: Record<TxStatusType, string> = {
  idle: '',
  pending: 'Esperando confirmación en tu wallet...',
  confirming: 'Transacción enviada. Esperando confirmación en la red...',
  success: '¡Transferencia confirmada!',
  error: 'La transacción falló.',
};

/**
 * Muestra el estado actual de una transacción en cadena.
 *
 * Renderiza `null` cuando el status es `idle`.
 * Incluye un enlace al explorador de bloques cuando el hash y la chain están disponibles.
 *
 * @example
 * ```tsx
 * <TxStatus status={status} txHash={txHash} chain={chain} error={error} />
 * ```
 */
export function TxStatus({ status, txHash, chain, error }: TxStatusProps) {
  if (status === 'idle') return null;

  const explorerUrl =
    txHash && chain ? getExplorerTxUrl(chain, txHash) : undefined;

  return (
    <div
      className={`${styles.root} ${styles[status]}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className={styles.message}>{STATUS_MESSAGES[status]}</p>

      {error && status === 'error' && (
        <p className={styles.errorDetail}>{parseErrorMessage(error)}</p>
      )}

      {txHash && (
        <p className={styles.hash}>
          {explorerUrl ? (
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
              Ver en explorador ↗
            </a>
          ) : (
            <span className={styles.mono}>{txHash}</span>
          )}
        </p>
      )}
    </div>
  );
}

function parseErrorMessage(error: Error): string {
  // Los errores de viem exponen shortMessage con el mensaje legible
  if ('shortMessage' in error && typeof error.shortMessage === 'string') {
    return error.shortMessage;
  }
  return error.message;
}
