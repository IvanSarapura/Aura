import Link from 'next/link';
import { isAddress } from 'viem';
import { notFound } from 'next/navigation';
import type { Address } from 'viem';
import { ConnectButton } from '@/components/ConnectButton/ConnectButton';
import { ReceiverProfile } from '@/components/ReceiverProfile/ReceiverProfile';
import styles from './address.module.css';

interface Props {
  params: Promise<{ address: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { address } = await params;
  const short = isAddress(address)
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;
  return { title: `${short} — Aura` };
}

export default async function AddressPage({ params }: Props) {
  const { address } = await params;

  if (!isAddress(address)) notFound();

  return (
    <main className={styles.main}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.logo}>
          Aura
        </Link>
        <ConnectButton />
      </header>

      <div className={styles.body}>
        <ReceiverProfile address={address as Address} />
      </div>
    </main>
  );
}
