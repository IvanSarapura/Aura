'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import styles from './address.module.css';

export default function AddressError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[address-page]', error);
  }, [error]);

  return (
    <main className={styles.main}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.logo}>
          ✦Aura
        </Link>
      </header>
      <div className={styles.errorState}>
        <p className={styles.errorTitle}>Could not load profile</p>
        <p className={styles.errorMsg}>{error.message}</p>
        <div className={styles.errorActions}>
          <button className={styles.retryBtn} onClick={reset} type="button">
            Try again
          </button>
          <Link href="/" className={styles.homeLink}>
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
