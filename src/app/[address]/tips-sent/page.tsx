import Link from 'next/link';
import { isAddress } from 'viem';
import { formatTxHashDisplay } from '@/lib/formatTxHash';
import { notFound } from 'next/navigation';
import type { Address } from 'viem';
import { ConnectButton } from '@/components/ConnectButton/ConnectButton';
import { TipFeed } from '@/components/TipFeed/TipFeed';
import { SentTipsGuard } from '@/components/SentTipsGuard/SentTipsGuard';
import styles from '../address.module.css';
import tipsStyles from './tips-sent.module.css';

interface Props {
  params: Promise<{ address: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { address } = await params;
  const short = isAddress(address) ? formatTxHashDisplay(address) : address;
  return { title: `Tips sent · ${short} — Aura` };
}

export default async function TipsSentPage({ params }: Props) {
  const { address } = await params;

  if (!isAddress(address)) notFound();

  return (
    <main className={styles.main}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.logo}>
          ✦Aura
        </Link>
        <ConnectButton />
      </header>

      <div className={styles.body}>
        <div className={tipsStyles.wrapper}>
          <SentTipsGuard address={address as Address}>
            <TipFeed
              address={address as Address}
              type="sent"
              headerTrailing={{ href: `/${address}`, label: 'Back' }}
              tipsFullPage
            />
          </SentTipsGuard>
        </div>
      </div>
    </main>
  );
}
