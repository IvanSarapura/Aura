'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import type { WagmiPublicEnv } from '@/config/wagmi';

// dynamic con ssr:false debe vivir en un Client Component, no en un Server Component.
// Por eso este archivo existe como intermediario entre layout.tsx y Web3Provider.
const Web3Provider = dynamic(
  () => import('./Web3Provider').then((mod) => mod.Web3Provider),
  { ssr: false },
);

export function ClientWeb3Provider({
  children,
  ...publicEnv
}: { children: ReactNode } & WagmiPublicEnv) {
  return <Web3Provider {...publicEnv}>{children}</Web3Provider>;
}
