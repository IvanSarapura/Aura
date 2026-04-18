'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { parseUnits } from 'viem';
import { useAccount } from 'wagmi';
import type { Address } from 'viem';
import { tipSchema, type TipFormData } from '@/lib/schemas/tip';
import { useAuraTip } from '@/hooks/useAuraTip';
import { TxStatus } from '@/components/TxStatus/TxStatus';
import { ShareCard } from '@/components/ShareCard/ShareCard';
import {
  isSupportedChain,
  getSupportedTokens,
  getDefaultToken,
  type TokenInfo,
} from '@/config/contracts';
import type { TrustLevel } from '@/hooks/useScout';
import { CategorySelect } from './CategorySelect';
import styles from './TipForm.module.css';

interface Props {
  recipient: Address;
  trustLevel?: TrustLevel;
}

const PHASE_LABELS = {
  idle: 'Send tip',
  approving: 'Approving…',
  tipping: 'Sending tip…',
  success: 'Tip sent!',
  error: 'Try again',
} as const;

export function TipForm({ recipient, trustLevel }: Props) {
  const { chainId } = useAccount();

  const supportedTokens: readonly TokenInfo[] =
    chainId && isSupportedChain(chainId) ? getSupportedTokens(chainId) : [];

  const [selectedToken, setSelectedToken] = useState<TokenInfo | undefined>(
    chainId && isSupportedChain(chainId) ? getDefaultToken(chainId) : undefined,
  );

  useEffect(() => {
    setSelectedToken(
      chainId && isSupportedChain(chainId)
        ? getDefaultToken(chainId)
        : undefined,
    );
  }, [chainId]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset: resetForm,
    formState: { errors },
  } = useForm<TipFormData>({
    resolver: zodResolver(tipSchema),
    defaultValues: { amount: '', category: 'work', message: '' },
  });

  const amount = watch('amount');
  const category = watch('category');
  const message = watch('message');

  const amountWei = (() => {
    try {
      return parseUnits(amount || '0', selectedToken?.decimals ?? 18);
    } catch {
      return 0n;
    }
  })();

  const {
    phase,
    approveTxHash,
    tipTxHash,
    errorMsg,
    canSubmit,
    needsApproval,
    submit,
    reset,
  } = useAuraTip({
    recipient,
    amountWei,
    tokenAddress:
      selectedToken?.address ?? '0x0000000000000000000000000000000000000000',
    category,
    message,
  });

  // Reset tip flow when token changes
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedToken?.address]);

  const onValid = () => submit();
  const handleReset = () => {
    reset();
    resetForm();
  };
  const isWorking = phase === 'approving' || phase === 'tipping';

  return (
    <form className={styles.form} onSubmit={handleSubmit(onValid)} noValidate>
      {phase === 'success' ? (
        <ShareCard
          recipient={recipient}
          amountDisplay={amount || '0'}
          trustLevel={trustLevel}
          tipTxHash={tipTxHash}
          onReset={handleReset}
        />
      ) : (
        <div className={styles.formPanel}>
          {/* Token selector — only shown when multiple tokens available */}
          {supportedTokens.length > 1 && (
            <div className={styles.field}>
              <label htmlFor="tip-token" className={styles.label}>
                Token
              </label>
              <select
                id="tip-token"
                className={styles.select}
                disabled={isWorking}
                value={selectedToken?.address ?? ''}
                onChange={(e) => {
                  const token = supportedTokens.find(
                    (t) =>
                      t.address.toLowerCase() === e.target.value.toLowerCase(),
                  );
                  if (token) setSelectedToken(token);
                }}
              >
                {supportedTokens.map((t) => (
                  <option key={t.address} value={t.address}>
                    {t.symbol} — {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount */}
          <div className={styles.field}>
            <label htmlFor="tip-amount" className={styles.label}>
              Amount
            </label>
            <div className={styles.amountRow}>
              <input
                id="tip-amount"
                className={`${styles.input} ${errors.amount ? styles.inputError : ''}`}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                disabled={isWorking}
                {...register('amount')}
              />
              <span className={styles.unit}>
                {selectedToken?.symbol ?? '—'}
              </span>
            </div>
            {errors.amount && (
              <p className={styles.error}>{errors.amount.message}</p>
            )}
          </div>

          {/* Category */}
          <div className={styles.field}>
            <label htmlFor="tip-category" className={styles.label}>
              Category
            </label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <CategorySelect
                  id="tip-category"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={isWorking}
                  invalid={!!errors.category}
                />
              )}
            />
            {errors.category && (
              <p className={styles.error}>{errors.category.message}</p>
            )}
          </div>

          {/* Message */}
          <div className={styles.field}>
            <label htmlFor="tip-message" className={styles.label}>
              Message <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              id="tip-message"
              className={`${styles.textarea} ${errors.message ? styles.inputError : ''}`}
              rows={3}
              placeholder="Say something nice…"
              disabled={isWorking}
              {...register('message')}
            />
            <span className={styles.charCount}>
              {(message ?? '').length}/280
            </span>
            {errors.message && (
              <p className={styles.error}>{errors.message.message}</p>
            )}
          </div>

          {needsApproval && phase === 'idle' && amountWei > 0n && (
            <p className={styles.hint}>
              Two steps: first approve {selectedToken?.symbol ?? 'token'}, then
              send the tip.
            </p>
          )}

          {phase === 'error' && errorMsg && (
            <p className={styles.errorMsg} role="alert">
              {errorMsg}
            </p>
          )}

          <TxStatus
            phase={phase}
            approveTxHash={approveTxHash}
            tipTxHash={tipTxHash}
            errorMsg={errorMsg}
          />

          <button
            className={styles.button}
            type="submit"
            disabled={!canSubmit || isWorking}
            aria-busy={isWorking}
          >
            {isWorking && <span className={styles.spinner} aria-hidden />}
            {PHASE_LABELS[phase]}
          </button>
        </div>
      )}
    </form>
  );
}
