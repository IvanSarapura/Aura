'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Address } from 'viem';
import { ConnectButton } from '@/components/ConnectButton/ConnectButton';
import { AddressInput } from '@/components/AddressInput/AddressInput';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const profile = process.env.NEXT_PUBLIC_CHAIN_PROFILE ?? 'testnet';
  const network = profile === 'mainnet' ? 'Celo Mainnet' : 'Celo Sepolia';

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
        <h1 className={styles.title}>✦ Aura</h1>
        <p className={styles.subtitle}>
          Wallet reputation + micro-payments on Celo
        </p>

        <div className={styles.network}>
          <span className={styles.dot} />
          {network}
        </div>

        <div className={styles.inputWrapper}>
          <AddressInput onSubmit={handleAddress} />
        </div>
      </div>
    </main>
  );
}
