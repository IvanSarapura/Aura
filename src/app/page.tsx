'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Address } from 'viem';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@/components/ConnectButton/ConnectButton';
import { AddressInput } from '@/components/AddressInput/AddressInput';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const { address } = useAccount();
  const profile = process.env.NEXT_PUBLIC_CHAIN_PROFILE ?? 'testnet';
  const network = profile === 'mainnet' ? 'Mainnet' : 'Testnet';

  const handleAddress = useCallback(
    (address: Address) => router.push(`/${address}`),
    [router],
  );

  return (
    <main className={styles.main}>
      <header className={styles.topbar}>
        <span />
        <ConnectButton />
      </header>

      <div className={styles.hero}>
        <h1 className={styles.title}>✦Aura</h1>
        <p className={styles.subtitle}>
          Wallet reputation &amp; micro-payments
        </p>

        <div className={styles.network}>
          <span className={styles.dot} />
          {network}
        </div>

        <div className={styles.inputWrapper}>
          <AddressInput onSubmit={handleAddress} />
        </div>

        {address && (
          <button
            className={styles.profileBtn}
            onClick={() => router.push(`/${address}`)}
            type="button"
          >
            <span className={styles.profileBtnIcon} aria-hidden>
              ✦
            </span>
            View your Aura profile
            <span className={styles.profileBtnArrow} aria-hidden>
              →
            </span>
          </button>
        )}
      </div>
    </main>
  );
}
