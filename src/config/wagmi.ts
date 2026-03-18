import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia } from 'wagmi/chains';
import { env } from './env';

export const config = getDefaultConfig({
  appName: env.appName,
  projectId: env.walletConnectProjectId,
  chains: [mainnet, sepolia],
  ssr: true,
});
