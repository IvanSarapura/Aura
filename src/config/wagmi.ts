import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { getActiveChains } from './chains';

export type WagmiPublicEnv = {
  walletConnectProjectId: string;
  appName: string;
  chainProfile: 'testnet' | 'mainnet';
};

export function createWagmiConfig({
  walletConnectProjectId,
  appName,
  chainProfile,
}: WagmiPublicEnv) {
  const projectId = walletConnectProjectId.trim();
  if (!projectId) {
    throw new Error(
      '[Aura] Falta NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (WalletConnect/Reown).\n' +
        'Añádelo a .env.local en la raíz del proyecto (copia .env.local.example) y reinicia el servidor de desarrollo.\n' +
        'ID gratis: https://cloud.reown.com',
    );
  }

  return getDefaultConfig({
    appName,
    projectId,
    chains: getActiveChains(chainProfile),
    ssr: true,
  });
}
