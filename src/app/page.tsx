import { ConnectButton } from '@rainbow-me/rainbowkit';
import { WalletInfo } from '@/components/WalletInfo';

export default function Home() {
  return (
    <main className="main">
      <div className="hero">
        <h1>Web3 Boilerplate</h1>
        <p>Next.js · Wagmi · RainbowKit · viem</p>
        <ConnectButton />
      </div>

      <section className="section">
        <WalletInfo />
      </section>
    </main>
  );
}
