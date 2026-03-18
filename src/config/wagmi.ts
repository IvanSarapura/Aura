import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? 'My Web3 App',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '',
  chains: [mainnet, sepolia],
  ssr: true, // Necesario para el App Router de Next.js
});
