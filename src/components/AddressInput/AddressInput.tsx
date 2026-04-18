'use client';

import { useState, useCallback } from 'react';
import { isAddress } from 'viem';
import type { Address } from 'viem';
import styles from './AddressInput.module.css';

interface Props {
  onSubmit: (address: Address) => void;
  disabled?: boolean;
}

export function AddressInput({ onSubmit, disabled = false }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | undefined>();

  const validate = useCallback((raw: string): Address | null => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setError('Enter a wallet address');
      return null;
    }
    if (!isAddress(trimmed)) {
      setError('Invalid Ethereum address');
      return null;
    }
    setError(undefined);
    return trimmed as Address;
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const addr = validate(value);
      if (addr) onSubmit(addr);
    },
    [value, validate, onSubmit],
  );

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.inputRow}>
        <input
          className={`${styles.input} ${error ? styles.inputError : ''}`}
          type="text"
          placeholder="0x… wallet address"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(undefined);
          }}
          disabled={disabled}
          aria-label="Recipient wallet address"
          aria-invalid={!!error}
          aria-describedby={error ? 'address-error' : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          className={styles.button}
          type="submit"
          disabled={disabled || !value.trim()}
        >
          Search
        </button>
      </div>
      {error && (
        <p id="address-error" className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
