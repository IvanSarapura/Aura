'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import type { Address } from 'viem';
import { ConnectButton } from '@/components/ConnectButton/ConnectButton';
import styles from './SentTipsGuard.module.css';

interface Props {
  address: Address;
  children: React.ReactNode;
}

export function SentTipsGuard({ address, children }: Props) {
  const { address: connectedAddress, isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className={styles.gate}>
        <p className={styles.message}>Connect your wallet to view sent tips.</p>
        <ConnectButton />
      </div>
    );
  }

  const isOwner =
    !!connectedAddress &&
    connectedAddress.toLowerCase() === address.toLowerCase();

  if (!isOwner) {
    return (
      <div className={styles.gate}>
        <p className={styles.message}>You can only view your own sent tips.</p>
        <Link href={`/${address}`} className={styles.backLink}>
          ← Back to profile
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
