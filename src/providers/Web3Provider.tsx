'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { createWagmiConfig, type WagmiPublicEnv } from '@/config/wagmi';
import { customDarkTheme } from '@/config/theme';
import { useMiniPay } from '@/hooks/useMiniPay';

// ── MiniPay: auto-connect bootstrap ─────────────────────────────────────────
// Must be a child of WagmiProvider (not in layout.tsx) so useConnect /
// useAccount are in scope. Returns null — purely a side-effect component.
function MiniPayEffects() {
  useMiniPay();
  return null;
}

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
        {/* ── MiniPay: auto-connect must be inside both WagmiProvider AND      */}
        {/* QueryClientProvider — wagmi v2 hooks use TanStack Query internally. */}
        <MiniPayEffects />
        <RainbowKitProvider theme={customDarkTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
