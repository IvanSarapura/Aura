'use client';

import { useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';
import type { TipEvent } from '@/lib/tipEvents';

export type { TipEvent };

export function useTips(
  address: Address,
  type: 'received' | 'sent' = 'received',
) {
  return useQuery<{ tips: TipEvent[] }, Error>({
    queryKey: ['tips', address, type],
    queryFn: async () => {
      const res = await fetch(`/api/tips?address=${address}&type=${type}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? 'Tips fetch failed',
        );
      }
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}
