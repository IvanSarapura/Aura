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
  tags: string[];
  isBuilder: boolean;
  stats: {
    txCount: number;
    usdmVolume: string;
    lastActive: string | null;
    walletAge: string | null;
  };
  auraStats: AuraStats | null;
}

export function useScout(address: Address) {
  return useQuery<ScoutResult, Error>({
    queryKey: ['scout', address],
    queryFn: async () => {
      const res = await fetch(`/api/scout?address=${address}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Scout failed');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
    retry: 1,
  });
}
