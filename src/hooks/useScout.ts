'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
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

export function useScout(address: Address, chainId?: number) {
  return useQuery<ScoutResult, Error>({
    queryKey: ['scout', address, chainId],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ address });
      if (chainId !== undefined) params.set('chainId', String(chainId));
      const res = await fetch(`/api/scout?${params}`, { signal });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Scout failed');
      }
      return res.json();
    },
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}
