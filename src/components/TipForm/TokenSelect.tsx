'use client';

import { useMemo, useState, useRef, useEffect, useId } from 'react';
import type { Address } from 'viem';
import type { TokenInfo } from '@/config/contracts';
import styles from './ListboxSelect.module.css';

function addrEq(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

export interface TokenSelectProps {
  id: string;
  value: string;
  tokens: readonly TokenInfo[];
  onChange: (address: Address) => void;
  onBlur: () => void;
  disabled?: boolean;
  invalid?: boolean;
  'aria-label'?: string;
}

export function TokenSelect({
  id,
  value,
  tokens,
  onChange,
  onBlur,
  disabled,
  invalid,
  'aria-label': ariaLabel,
}: TokenSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = useMemo(
    () => tokens.find((t) => addrEq(t.address, value)),
    [tokens, value],
  );

  const triggerLabel = selected?.symbol ?? 'Select token';

  const rows = useMemo(
    () =>
      tokens.map((t) => ({
        key: t.address,
        address: t.address as Address,
        label: t.symbol,
        disabled: t.tipEnabled === false,
      })),
    [tokens],
  );

  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent | PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        onBlur();
      }
    };
    document.addEventListener('pointerdown', handlePointer, true);
    return () =>
      document.removeEventListener('pointerdown', handlePointer, true);
  }, [open, onBlur]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        onBlur();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onBlur]);

  return (
    <div className={styles.wrapper} ref={containerRef}>
      <button
        type="button"
        id={id}
        className={`${styles.trigger} ${invalid ? styles.triggerError : ''}`}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (disabled) return;
          setOpen((o) => !o);
        }}
      >
        <span className={styles.triggerLabel}>{triggerLabel}</span>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 4L6 8L10 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className={`${styles.panel} ${open ? styles.panelOpen : ''}`}>
        <div className={styles.panelInner}>
          <ul
            id={listId}
            role="listbox"
            className={styles.list}
            aria-labelledby={id}
            inert={!open}
          >
            {rows.map((row) => {
              const isSelected = addrEq(row.address, value);
              return (
                <li
                  key={row.key}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={row.disabled}
                  className={`${styles.option} ${isSelected ? styles.optionSelected : ''} ${row.disabled ? styles.optionDisabled : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (row.disabled) return;
                    onChange(row.address);
                    setOpen(false);
                    onBlur();
                  }}
                >
                  {row.label}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
