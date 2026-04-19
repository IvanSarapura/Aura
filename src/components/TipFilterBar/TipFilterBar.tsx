'use client';

import { useState, useDeferredValue, useEffect } from 'react';
import {
  hasActiveFilters,
  EMPTY_FILTERS,
  type TipFilters,
} from '@/lib/filterTips';
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
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        aria-controls="tip-filter-form"
      >
        <span className={styles.toggleLeft}>
          <span className={styles.label}>Filter</span>
          {activeCount > 0 && (
            <span
              className={styles.badge}
              aria-label={`${activeCount} active filters`}
            >
              {activeCount}
            </span>
          )}
        </span>
        <span
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {isOpen && (
        <div
          id="tip-filter-form"
          className={styles.form}
          role="search"
          aria-label="Filter tips"
        >
          {/* Category */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="filter-category">
              Category
            </label>
            <div className={styles.selectWrapper}>
              <select
                id="filter-category"
                className={styles.select}
                value={draft.category}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, category: e.target.value }))
                }
                disabled={disabled}
              >
                <option value="">All categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount range */}
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel} id="filter-amount-label">
              Amount
            </span>
            <div
              className={styles.amountRow}
              role="group"
              aria-labelledby="filter-amount-label"
            >
              <input
                id="filter-amount-min"
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
                id="filter-amount-max"
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

          {/* Address */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="filter-address">
              Address
            </label>
            <input
              id="filter-address"
              className={styles.input}
              type="text"
              placeholder="0x… peer address"
              value={draft.peerAddress}
              onChange={(e) =>
                setDraft((d) => ({ ...d, peerAddress: e.target.value }))
              }
              disabled={disabled}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* Footer: clear + result count */}
          <div className={styles.footer}>
            {activeCount > 0 ? (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={handleClear}
              >
                × Clear filters
              </button>
            ) : (
              <span />
            )}
            <span
              className={styles.resultCount}
              aria-live="polite"
              aria-atomic="true"
            >
              {isFiltered ? (
                <>
                  <span className={styles.resultCountHighlight}>
                    {resultCount}
                  </span>{' '}
                  of {totalCount} tips
                </>
              ) : (
                <>{totalCount} tips</>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
