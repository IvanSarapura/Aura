'use client';

import { useScout } from '@/hooks/useScout';
import { ImpactCard } from '@/components/ImpactCard/ImpactCard';
import { TipForm } from '@/components/TipForm/TipForm';
import { PaymentLink } from '@/components/PaymentLink/PaymentLink';
import { TipFeed } from '@/components/TipFeed/TipFeed';
import { SelfProfileBanner } from '@/components/SelfProfileBanner/SelfProfileBanner';
import { useAccount } from 'wagmi';
import type { Address } from 'viem';
import { useAuraTipStats } from '@/hooks/useAuraTipStats';
import styles from './ReceiverProfile.module.css';

interface Props {
  address: Address;
}

interface ContentProps extends Props {
  isOwnProfile: boolean;
}

function ProfileContent({ address, isOwnProfile }: ContentProps) {
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

      <TipFeed address={address} type="received" />

      {isOwnProfile && (
        <TipFeed address={address} type="sent" title="Tips you sent" />
      )}

      {!isOwnProfile &&
        (isConnected ? (
          <section className={styles.tipSection}>
            <h2 className={styles.tipHeading}>Send a tip</h2>
            <TipForm recipient={address} trustLevel={data.trustLevel} />
          </section>
        ) : (
          <p className={styles.connectPrompt}>
            Connect your wallet to send a tip.
          </p>
        ))}
    </div>
  );
}

export function ReceiverProfile({ address }: Props) {
  const { tipsReceivedCount, isPending: statsLoading } =
    useAuraTipStats(address);
  const { address: myAddress } = useAccount();
  const isOwnProfile =
    !!myAddress && myAddress.toLowerCase() === address.toLowerCase();

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1 className={styles.addressTitle}>
          {address.slice(0, 6)}…{address.slice(-4)}
        </h1>
        <p className={styles.addressFull}>{address}</p>
        {!statsLoading && tipsReceivedCount > 0n && (
          <span
            className={styles.onChainBadge}
            title="Verified tip count from the AuraTip smart contract"
          >
            ✓ {tipsReceivedCount.toString()} on-chain tips
          </span>
        )}
      </header>

      {isOwnProfile && <SelfProfileBanner address={address} />}

      <ProfileContent address={address} isOwnProfile={isOwnProfile} />
    </div>
  );
}
