'use client';

import { useState, useRef, useEffect, useId } from 'react';
import type { TipCategory } from '@/lib/schemas/tip';
import { TIP_CATEGORIES } from '@/lib/schemas/tip';
import styles from './CategorySelect.module.css';

function formatCategory(c: string) {
  return c.charAt(0).toUpperCase() + c.slice(1);
}

interface Props {
  id: string;
  value: TipCategory;
  onChange: (v: TipCategory) => void;
  onBlur: () => void;
  disabled?: boolean;
  invalid?: boolean;
}

export function CategorySelect({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  invalid,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

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
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (disabled) return;
          setOpen((o) => !o);
        }}
      >
        <span className={styles.triggerLabel}>{formatCategory(value)}</span>
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
            {TIP_CATEGORIES.map((c) => (
              <li
                key={c}
                role="option"
                aria-selected={c === value}
                className={`${styles.option} ${c === value ? styles.optionSelected : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                  onBlur();
                }}
              >
                {formatCategory(c)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
