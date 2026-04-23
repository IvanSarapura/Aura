'use client';

import { useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';

export type TrustLevel = 'Low' | 'Medium' | 'High';

export interface AuraStats {
  tipsReceived: number;
  tipsSent: number;
  uniqueTippers: number;
  topCategories: string[];
  totalVolumeReceived: string;
}

export interface ScoutResult {
  trustLevel: TrustLevel;
  headline: string;
  isBuilder: boolean;
  stats: {
    txCount: number;
    stablecoinVolume: string;
    lastActive: string | null;
    walletAge: string | null;
  };
  auraStats: AuraStats | null;
}

export function useScout(address: Address) {
  return useQuery<ScoutResult, Error>({
    queryKey: ['scout', address],
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/scout?address=${address}`, { signal });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Scout failed');
      }
      return res.json();
    },
    // This data is user-facing and changes over time (new txs, activity).
    // Keep it fresh without being overly chatty.
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}
