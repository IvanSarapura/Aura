'use client';

import { useState, useDeferredValue, useEffect, useId } from 'react';
import {
  hasActiveFilters,
  EMPTY_FILTERS,
  type TipFilters,
} from '@/lib/filterTips';
import { CategorySelect } from '@/components/TipForm/CategorySelect';
import styles from './TipFilterBar.module.css';

interface Props {
  filters: TipFilters;
  onChange: (f: TipFilters) => void;
  categories: string[];
  resultCount: number;
  totalCount: number;
  disabled: boolean;
}

export function TipFilterBar({
  filters,
  onChange,
  categories,
  resultCount,
  totalCount,
  disabled,
}: Props) {
  const id = useId();

  // Local draft state — updates are deferred so the list re-renders
  // non-blockingly while the user types.
  const [draft, setDraft] = useState<TipFilters>(filters);
  const deferred = useDeferredValue(draft);

  // Propagate deferred draft up to TipFeed
  useEffect(() => {
    onChange(deferred);
  }, [deferred, onChange]);

  // Keep local draft in sync when parent resets filters (e.g. address change)
  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const activeCount = [
    draft.minAmount.trim(),
    draft.maxAmount.trim(),
    draft.category,
    draft.peerAddress.trim(),
  ].filter(Boolean).length;

  function handleClear() {
    setDraft(EMPTY_FILTERS);
  }

  const isFiltered = hasActiveFilters(deferred);
  const titleId = `${id}-filters-heading`;
  const categoryId = `${id}-category`;
  const amountLabelId = `${id}-amount-label`;
  const addressId = `${id}-address`;

  return (
    <section className={styles.card} role="search" aria-labelledby={titleId}>
      <header className={styles.cardHeader}>
        <div className={styles.headerRow}>
          <h3 className={styles.cardTitle} id={titleId}>
            Filters
          </h3>
          {activeCount > 0 ? (
            <span
              className={styles.badge}
              aria-label={`${activeCount} active filters`}
            >
              {activeCount}
            </span>
          ) : null}
        </div>
        <p className={styles.resultLine} aria-live="polite" aria-atomic="true">
          {isFiltered ? (
            <>
              <span className={styles.resultHighlight}>{resultCount}</span>
              {' of '}
              {totalCount} tips match
            </>
          ) : (
            <>{totalCount} tips</>
          )}
        </p>
      </header>

      <div className={styles.fieldsGrid}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor={categoryId}>
            Category
          </label>
          <CategorySelect
            id={categoryId}
            value={draft.category}
            onChange={(v) => setDraft((d) => ({ ...d, category: v }))}
            onBlur={() => {}}
            disabled={disabled}
            emptyOptionLabel="All categories"
            options={categories}
          />
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel} id={amountLabelId}>
            Amount
          </span>
          <div
            className={styles.amountRow}
            role="group"
            aria-labelledby={amountLabelId}
          >
            <input
              id={`${id}-amount-min`}
              className={styles.input}
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="Min"
              value={draft.minAmount}
              onChange={(e) =>
                setDraft((d) => ({ ...d, minAmount: e.target.value }))
              }
              disabled={disabled}
              aria-label="Minimum amount"
            />
            <span className={styles.amountSep} aria-hidden>
              —
            </span>
            <input
              id={`${id}-amount-max`}
              className={styles.input}
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="Max"
              value={draft.maxAmount}
              onChange={(e) =>
                setDraft((d) => ({ ...d, maxAmount: e.target.value }))
              }
              disabled={disabled}
              aria-label="Maximum amount"
            />
          </div>
        </div>

        <div className={`${styles.fieldGroup} ${styles.fieldSpanFull}`}>
          <label className={styles.fieldLabel} htmlFor={addressId}>
            Peer address
          </label>
          <input
            id={addressId}
            className={`${styles.input} ${styles.inputMono}`}
            type="text"
            placeholder="0x…"
            value={draft.peerAddress}
            onChange={(e) =>
              setDraft((d) => ({ ...d, peerAddress: e.target.value }))
            }
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
          />
        </div>
      </div>

      {activeCount > 0 ? (
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.clearBtn}
            onClick={handleClear}
          >
            Clear filters
          </button>
        </div>
      ) : null}
    </section>
  );
}
