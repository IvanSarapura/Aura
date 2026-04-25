'use client';

import { useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';
import type { ScoutFastResult } from './useScout';

export function useScoutFast(address: Address, chainId?: number) {
  return useQuery<ScoutFastResult, Error>({
    queryKey: ['scout', address, chainId, 'fast'],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ address });
      if (chainId !== undefined) params.set('chainId', String(chainId));
      const res = await fetch(`/api/scout/fast?${params}`, { signal });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? 'Fast scout failed',
        );
      }
      return res.json();
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
  });
}
