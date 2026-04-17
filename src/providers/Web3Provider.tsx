'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { createWagmiConfig, type WagmiPublicEnv } from '@/config/wagmi';
import { customDarkTheme } from '@/config/theme';

export function Web3Provider({
  children,
  walletConnectProjectId,
  appName,
  chainProfile,
}: { children: React.ReactNode } & WagmiPublicEnv) {
  const [queryClient] = useState(() => new QueryClient());
  const config = useMemo(
    () =>
      createWagmiConfig({
        walletConnectProjectId,
        appName,
        chainProfile,
      }),
    [walletConnectProjectId, appName, chainProfile],
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={customDarkTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
