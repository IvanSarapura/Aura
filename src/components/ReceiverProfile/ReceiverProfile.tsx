'use client';

import { useScout } from '@/hooks/useScout';
import { useRefreshProfile } from '@/hooks/useRefreshProfile';
import { ImpactCard } from '@/components/ImpactCard/ImpactCard';
import { TipForm } from '@/components/TipForm/TipForm';
import { PaymentLink } from '@/components/PaymentLink/PaymentLink';
import { TipFeed } from '@/components/TipFeed/TipFeed';
import { SelfProfileBanner } from '@/components/SelfProfileBanner/SelfProfileBanner';
import { useAccount, useChainId } from 'wagmi';
import type { Address } from 'viem';
import { formatTxHashDisplay } from '@/lib/formatTxHash';
import styles from './ReceiverProfile.module.css';

interface Props {
  address: Address;
}

interface ContentProps extends Props {
  isOwnProfile: boolean;
}

function RefreshButton({ address }: { address: Address }) {
  const { refresh, isRefreshing, inCooldown, secondsLeft, justUpdated } =
    useRefreshProfile(address);

  let label: string;
  if (isRefreshing) label = 'Updating…';
  else if (justUpdated) label = 'Updated';
  else if (inCooldown) label = `Retry in ${secondsLeft}s`;
  else label = 'Refresh';

  return (
    <button
      type="button"
      className={`${styles.refreshBtn}${justUpdated ? ` ${styles.refreshBtnSuccess}` : ''}`}
      onClick={refresh}
      disabled={isRefreshing || inCooldown}
      aria-busy={isRefreshing}
      aria-label="Refresh wallet data"
    >
      <span
        className={`${styles.refreshIcon}${isRefreshing ? ` ${styles.refreshIconSpinning}` : ''}`}
        aria-hidden="true"
      >
        ↻
      </span>
      {label}
    </button>
  );
}

function ProfileContent({ address, isOwnProfile }: ContentProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { data, isPending, isError, isPlaceholderData } = useScout(
    address,
    chainId,
  );

  // ImpactCard shows inline mini-skeletons while scout data loads or refreshes
  // for a new chain. TipFeed always renders independently with its own skeleton.
  const scoutLoading = isPending || isPlaceholderData;

  return (
    <div className={styles.content}>
      <div className={styles.refreshRow}>
        <RefreshButton address={address} />
      </div>

      {isError && !data ? (
        <div className={styles.errorMsg}>
          Could not load wallet data. Try again later.
          <div
            className={styles.refreshRow}
            style={{ justifyContent: 'center' }}
          >
            <RefreshButton address={address} />
          </div>
        </div>
      ) : (
        <ImpactCard
          result={data ?? null}
          address={address}
          isLoading={scoutLoading}
        />
      )}

      <PaymentLink address={address} />

      <TipFeed
        key={address}
        address={address}
        type="received"
        viewAllHref={`/${address}/tips`}
      />

      {isOwnProfile && (
        <TipFeed
          key={`${address}-sent`}
          address={address}
          type="sent"
          title="Tips you sent"
          viewAllHref={`/${address}/tips-sent`}
        />
      )}

      {!isOwnProfile &&
        (isConnected ? (
          <section className={styles.tipSection}>
            <h2 className={styles.tipHeading}>Send a tip</h2>
            <TipForm
              recipient={address}
              trustLevel={data?.trustLevel ?? 'Low'}
            />
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
  const { address: myAddress } = useAccount();
  const isOwnProfile =
    !!myAddress && myAddress.toLowerCase() === address.toLowerCase();

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1 className={styles.addressTitle} title={address}>
          {formatTxHashDisplay(address)}
        </h1>
        <p className={styles.addressFull}>{address}</p>
      </header>

      {isOwnProfile && <SelfProfileBanner address={address} />}

      <ProfileContent address={address} isOwnProfile={isOwnProfile} />
    </div>
  );
}
