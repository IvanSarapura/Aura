'use client';

import { useScout } from '@/hooks/useScout';
import { ImpactCard } from '@/components/ImpactCard/ImpactCard';
import { TipForm } from '@/components/TipForm/TipForm';
import { PaymentLink } from '@/components/PaymentLink/PaymentLink';
import { useAccount } from 'wagmi';
import type { Address } from 'viem';
import styles from './ReceiverProfile.module.css';

interface Props {
  address: Address;
}

function ProfileContent({ address }: Props) {
  const { data, isPending, isError } = useScout(address);
  const { isConnected } = useAccount();

  if (isPending) {
    return (
      <div className={styles.loading} aria-busy="true">
        Scouting wallet…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={styles.errorMsg}>
        Could not load wallet data. Try again later.
      </div>
    );
  }

  return (
    <div className={styles.content}>
      <ImpactCard result={data} address={address} />

      <PaymentLink address={address} />

      {isConnected ? (
        <section className={styles.tipSection}>
          <h2 className={styles.tipHeading}>Send a tip</h2>
          <TipForm recipient={address} trustLevel={data.trustLevel} />
        </section>
      ) : (
        <p className={styles.connectPrompt}>
          Connect your wallet to send a tip.
        </p>
      )}
    </div>
  );
}

export function ReceiverProfile({ address }: Props) {
  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1 className={styles.addressTitle}>
          {address.slice(0, 6)}…{address.slice(-4)}
        </h1>
        <p className={styles.addressFull}>{address}</p>
      </header>
      <ProfileContent address={address} />
    </div>
  );
}
