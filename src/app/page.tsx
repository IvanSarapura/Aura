import styles from './page.module.css';

export const metadata = {
  title: 'Aura — Wallet Reputation on Celo',
};

export default function Home() {
  const profile = process.env.NEXT_PUBLIC_CHAIN_PROFILE ?? 'testnet';
  const network = profile === 'mainnet' ? 'Celo Mainnet' : 'Celo Sepolia';

  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Aura</h1>
        <p className={styles.subtitle}>
          Wallet reputation + micro-payments on Celo
        </p>

        <div className={styles.network}>
          <span className={styles.dot} />
          {network}
        </div>

        {/* Phase 0 placeholder — WalletConnect + ReceiverProfile in Phase 2 */}
        <span className={styles.badge}>Phase 0 — Foundation ✓</span>
      </div>
    </main>
  );
}
