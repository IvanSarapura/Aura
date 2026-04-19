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
import { TokenSelect } from './TokenSelect';
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
          tokenSymbol={selectedToken?.symbol ?? 'USDm'}
          trustLevel={trustLevel}
          tipTxHash={tipTxHash}
          onReset={handleReset}
        />
      ) : (
        <div className={styles.formPanel}>
          {/* Amount + currency: one row (mobile-first). Token list from contracts. */}
          <div className={styles.field}>
            <p id="tip-amount-label" className={styles.label}>
              Amount
            </p>
            {supportedTokens.length > 0 ? (
              <div
                className={styles.amountCurrencyRow}
                role="group"
                aria-labelledby="tip-amount-label"
              >
                <input
                  id="tip-amount"
                  className={`${styles.input} ${styles.amountInput} ${errors.amount ? styles.inputError : ''}`}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  disabled={isWorking}
                  aria-describedby={
                    errors.amount ? 'tip-amount-error' : undefined
                  }
                  {...register('amount')}
                />
                <div className={styles.currencySelect}>
                  <TokenSelect
                    id="tip-currency"
                    tokens={supportedTokens}
                    value={selectedToken?.address ?? ''}
                    onChange={(addr) => {
                      const token = supportedTokens.find(
                        (t) => t.address.toLowerCase() === addr.toLowerCase(),
                      );
                      if (token && token.tipEnabled !== false) {
                        setSelectedToken(token);
                      }
                    }}
                    onBlur={() => {}}
                    disabled={isWorking}
                    aria-label="Tip currency"
                  />
                </div>
              </div>
            ) : (
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
            )}
            {errors.amount && (
              <p id="tip-amount-error" className={styles.error}>
                {errors.amount.message}
              </p>
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

          <TxStatus phase={phase} tipTxHash={tipTxHash} errorMsg={errorMsg} />

          {phase === 'error' ? (
            <button className={styles.button} type="button" onClick={reset}>
              Try again
            </button>
          ) : (
            <button
              className={styles.button}
              type="submit"
              disabled={!canSubmit || isWorking}
              aria-busy={isWorking}
            >
              {isWorking && <span className={styles.spinner} aria-hidden />}
              {PHASE_LABELS[phase]}
            </button>
          )}
        </div>
      )}
    </form>
  );
}
