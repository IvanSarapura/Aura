import { ConnectButton } from '@rainbow-me/rainbowkit';
import { WalletInfo } from '@/components/WalletInfo';
import { TokenInfo } from '@/components/TokenInfo';
import { TransferForm } from '@/components/TransferForm';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className="main">
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Web3 Boilerplate</h1>
        <p className={styles.heroSubtitle}>
          Next.js · Wagmi · RainbowKit · viem
        </p>
        <ConnectButton />
      </div>

      <section className={styles.section}>
        <WalletInfo />
        <TokenInfo />
        <TransferForm />
      </section>
    </main>
  );
}
