'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { parseUnits } from 'viem';
import type { Address } from 'viem';
import { tipSchema, TIP_CATEGORIES, type TipFormData } from '@/lib/schemas/tip';
import { useAuraTip } from '@/hooks/useAuraTip';
import { TxStatus } from '@/components/TxStatus/TxStatus';
import { ShareCard } from '@/components/ShareCard/ShareCard';
import type { TrustLevel } from '@/hooks/useScout';
import styles from './TipForm.module.css';

interface Props {
  recipient: Address;
  trustLevel?: TrustLevel;
}

const PHASE_LABELS = {
  idle: 'Send tip',
  approving: 'Approving USDm…',
  tipping: 'Sending tip…',
  success: 'Tip sent!',
  error: 'Try again',
} as const;

export function TipForm({ recipient, trustLevel }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    reset: resetForm,
    formState: { errors },
  } = useForm<TipFormData>({
    resolver: zodResolver(tipSchema),
    defaultValues: { amount: '', category: 'thanks', message: '' },
  });

  const amount = watch('amount');
  const category = watch('category');
  const message = watch('message');

  const amountWei = (() => {
    try {
      return parseUnits(amount || '0', 18);
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
    category,
    message,
  });

  const onValid = () => submit();

  const handleReset = () => {
    reset();
    resetForm();
  };

  const isWorking = phase === 'approving' || phase === 'tipping';

  return (
    <form className={styles.form} onSubmit={handleSubmit(onValid)} noValidate>
      {/* Amount */}
      <div className={styles.field}>
        <label htmlFor="tip-amount" className={styles.label}>
          Amount (USDm)
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
          <span className={styles.unit}>USDm</span>
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
        <select
          id="tip-category"
          className={styles.select}
          disabled={isWorking}
          {...register('category')}
        >
          {TIP_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
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
        <span className={styles.charCount}>{(message ?? '').length}/280</span>
        {errors.message && (
          <p className={styles.error}>{errors.message.message}</p>
        )}
      </div>

      {/* Approval hint */}
      {needsApproval && phase === 'idle' && amountWei > 0n && (
        <p className={styles.hint}>
          Two steps: first approve USDm, then send the tip.
        </p>
      )}

      {/* Error */}
      {phase === 'error' && errorMsg && (
        <p className={styles.errorMsg} role="alert">
          {errorMsg}
        </p>
      )}

      {/* Tx progress */}
      <TxStatus
        phase={phase}
        approveTxHash={approveTxHash}
        tipTxHash={tipTxHash}
        errorMsg={errorMsg}
      />

      {/* Success — show ShareCard */}
      {phase === 'success' && (
        <ShareCard
          recipient={recipient}
          amountDisplay={amount || '0'}
          trustLevel={trustLevel}
          tipTxHash={tipTxHash}
          onReset={handleReset}
        />
      )}

      {/* Submit */}
      {phase !== 'success' && (
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
    </form>
  );
}
