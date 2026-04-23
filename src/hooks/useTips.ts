'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { Address } from 'viem';
import type { TipEvent } from '@/lib/tipEvents';

export type { TipEvent };

interface TipsPage {
  tips: TipEvent[];
  hasMore: boolean;
  nextPage: number | null;
  total: number;
}

export function useTips(
  address: Address,
  type: 'received' | 'sent' = 'received',
) {
  return useInfiniteQuery<TipsPage, Error>({
    queryKey: ['tips', address, type],
    queryFn: async ({ pageParam, signal }) => {
      const page = pageParam as number;
      const res = await fetch(
        `/api/tips?address=${address}&type=${type}&page=${page}`,
        { signal },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? 'Tips fetch failed',
        );
      }
      return res.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}
