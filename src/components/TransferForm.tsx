'use client';

import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { isAddress, type Address } from 'viem';
import { erc20Abi } from '@/abi/erc20';
import { getUsdcAddress } from '@/config/contracts';
import { getSupportedChainNames } from '@/config/chains';
import { useErc20Transfer } from '@/hooks/useErc20Transfer';
import { TxStatus } from './TxStatus';
import styles from './TransferForm.module.css';

/**
 * Ejemplo de escritura en contrato ERC-20.
 *
 * Demuestra el patrón canónico de wagmi v2 para transacciones:
 * - `useSimulateContract`: detecta reverts antes de pedir la firma.
 * - `useWriteContract`:    envía la tx al ser aprobada por el usuario.
 * - `useWaitForTransactionReceipt`: espera la confirmación en la red.
 *
 * Para adaptar a tu propio contrato:
 * 1. Reemplazá `erc20Abi` por tu ABI en src/abi/.
 * 2. Reemplazá `getUsdcAddress` por la función que resuelve tu contrato.
 * 3. Actualizá `functionName` en useErc20Transfer si es necesario.
 */
export function TransferForm() {
  const { isConnected, chain } = useAccount();
  const contractAddress =
    chain?.id !== undefined ? getUsdcAddress(chain.id) : undefined;
  const isSupported = !!contractAddress;

  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');

  // Lee los decimales del contrato para parsear el monto correctamente
  const { data: decimals } = useReadContract({
    address: contractAddress,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: isConnected && isSupported },
  });

  const toAddress = isAddress(to) ? (to as Address) : undefined;
  const parsedAmount = parseFloat(amount);
  const amountValid = amount !== '' && !isNaN(parsedAmount) && parsedAmount > 0;

  const { execute, status, txHash, error, simulateError, reset, canExecute } =
    useErc20Transfer({
      contractAddress,
      decimals,
      to: toAddress,
      amount: amountValid ? amount : '',
    });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    execute();
  };

  const handleReset = () => {
    setTo('');
    setAmount('');
    reset();
  };

  if (!isConnected) return null;

  if (!isSupported) {
    return (
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Transferir Token (ejemplo)</h2>
        <p className={styles.hint}>
          Cambiá a una de estas redes para ver este ejemplo de escritura en
          contrato: {getSupportedChainNames()}.
        </p>
      </div>
    );
  }

  const isSubmitting = status === 'pending' || status === 'confirming';
  const isDone = status === 'success';

  const toError = to && !toAddress ? 'Dirección inválida' : undefined;
  const amountError =
    amount && !amountValid ? 'Ingresá un monto positivo válido' : undefined;

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Transferir Token (ejemplo)</h2>
      <p className={styles.hint}>
        Ejemplo de escritura en contrato con <code>useWriteContract</code> y
        simulación previa.
      </p>

      {isDone ? (
        <>
          <TxStatus status={status} txHash={txHash} chain={chain} />
          <button
            className={styles.resetButton}
            onClick={handleReset}
            type="button"
          >
            Nueva transferencia
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="tf-to" className={styles.label}>
              Dirección destino
            </label>
            <input
              id="tf-to"
              type="text"
              className={`${styles.input} ${toError ? styles.inputError : ''}`}
              placeholder="0x..."
              value={to}
              onChange={(e) => setTo(e.target.value.trim())}
              disabled={isSubmitting}
              spellCheck={false}
              autoComplete="off"
            />
            {toError && <span className={styles.fieldError}>{toError}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="tf-amount" className={styles.label}>
              Monto (USDC)
            </label>
            <input
              id="tf-amount"
              type="text"
              inputMode="decimal"
              className={`${styles.input} ${amountError ? styles.inputError : ''}`}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
            />
            {amountError && (
              <span className={styles.fieldError}>{amountError}</span>
            )}
          </div>

          {simulateError && (
            <p className={styles.simulateError}>
              {parseErrorMessage(simulateError)}
            </p>
          )}

          <TxStatus
            status={status}
            txHash={txHash}
            chain={chain}
            error={error}
          />

          <button
            type="submit"
            className={styles.submitButton}
            disabled={!canExecute || isSubmitting}
          >
            {isSubmitting ? 'Procesando...' : 'Enviar'}
          </button>
        </form>
      )}
    </div>
  );
}

function parseErrorMessage(error: Error): string {
  if ('shortMessage' in error && typeof error.shortMessage === 'string') {
    return error.shortMessage;
  }
  return error.message;
}
