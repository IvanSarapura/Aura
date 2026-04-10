'use client';

import {
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { parseUnits, type Address } from 'viem';
import { erc20Abi } from '@/abi/erc20';

/**
 * Estado del ciclo de vida de una transacción de transferencia ERC-20.
 *
 * - idle:       Sin transacción en curso.
 * - pending:    Esperando que el usuario firme en la wallet.
 * - confirming: Transacción firmada, esperando confirmación en la red.
 * - success:    Transacción incluida y exitosa en la cadena.
 * - error:      Falló la firma, fue rechazada, o fue revertida en la cadena.
 */
export type TxStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

export interface UseErc20TransferReturn {
  /** Ejecuta la transacción usando los datos pre-simulados. */
  execute: () => void;
  /** Estado unificado del ciclo de vida. */
  status: TxStatus;
  /** Hash de la transacción, disponible desde que se firma. */
  txHash: `0x${string}` | undefined;
  /**
   * Error de firma o de receipt (rechazo del usuario, tx revertida en cadena).
   * Distinto de simulateError, que ocurre antes de enviar la tx.
   */
  error: Error | null;
  /**
   * Error de simulación: el contrato revertirá si se ejecuta con los args actuales
   * (por ejemplo, saldo insuficiente). La transacción aún no fue enviada.
   */
  simulateError: Error | null;
  /** Resetea el estado de la transacción para permitir un nuevo intento. */
  reset: () => void;
  /** true cuando la simulación fue exitosa y la tx está lista para enviarse. */
  canExecute: boolean;
}

interface UseErc20TransferParams {
  contractAddress: Address | undefined;
  decimals: number | undefined;
  to: Address | undefined;
  /** Monto en unidades legibles por humanos, p. ej. "10.5". Vacío deshabilita la simulación. */
  amount: string;
}

function tryParseUnits(amount: string, decimals: number): bigint | undefined {
  try {
    const parsed = parseUnits(amount, decimals);
    return parsed > BigInt(0) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Hook que encapsula el flujo completo de una transferencia ERC-20:
 * simulación → firma → espera de confirmación.
 *
 * Patrón de uso recomendado por wagmi v2:
 * 1. `useSimulateContract` — verifica que la tx no revertirá antes de enviarla.
 * 2. `useWriteContract`    — envía la tx con el request pre-simulado.
 * 3. `useWaitForTransactionReceipt` — espera que la tx sea incluida en un bloque.
 *
 * @example
 * ```tsx
 * const { execute, status, txHash, error, simulateError, canExecute } =
 *   useErc20Transfer({ contractAddress, decimals, to, amount });
 *
 * <button onClick={execute} disabled={!canExecute}>Enviar</button>
 * ```
 */
export function useErc20Transfer({
  contractAddress,
  decimals,
  to,
  amount,
}: UseErc20TransferParams): UseErc20TransferReturn {
  const parsedAmount =
    decimals !== undefined && amount
      ? tryParseUnits(amount, decimals)
      : undefined;

  const isReady = !!contractAddress && !!to && !!parsedAmount;

  // Paso 1 — Simulación: detecta reverts antes de pedir firma al usuario.
  const { data: simulateData, error: simulateError } = useSimulateContract({
    address: contractAddress,
    abi: erc20Abi,
    functionName: 'transfer',
    // Las aserciones son seguras: isReady garantiza que estos valores existen.
    args: [to!, parsedAmount!],
    query: { enabled: isReady },
  });

  // Paso 2 — Escritura: abre el modal de firma en la wallet del usuario.
  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
    reset,
  } = useWriteContract();

  // Paso 3 — Espera del receipt: polling hasta que la tx es incluida en un bloque.
  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash: txHash });

  const execute = () => {
    if (simulateData?.request) {
      writeContract(simulateData.request);
    }
  };

  const isReverted = receipt?.status === 'reverted';
  const revertError = isReverted
    ? new Error('La transacción fue revertida en la red.')
    : null;

  const error = writeError ?? receiptError ?? revertError;

  const status: TxStatus = (() => {
    if (isSuccess && !isReverted) return 'success';
    if (isConfirming) return 'confirming';
    if (isPending) return 'pending';
    if (error) return 'error';
    return 'idle';
  })();

  const isActive = isPending || isConfirming;

  return {
    execute,
    status,
    txHash,
    error: error ?? null,
    simulateError: (simulateError as Error | null) ?? null,
    reset,
    canExecute: !!simulateData?.request && !isActive,
  };
}
