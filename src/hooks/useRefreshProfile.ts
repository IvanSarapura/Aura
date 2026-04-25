'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import type { Address } from 'viem';

const COOLDOWN_MS = 15_000;

interface RefreshState {
  refresh: () => void;
  isRefreshing: boolean;
  inCooldown: boolean;
  secondsLeft: number;
  justUpdated: boolean;
}

export function useRefreshProfile(address: Address): RefreshState {
  const queryClient = useQueryClient();
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [justUpdated, setJustUpdated] = useState(false);

  // Observe fetching state across all profile queries without prop-drilling.
  // Partial key match: ['scout', address] covers ['scout', address, chainId],
  // and ['tips', address] covers both received and sent variants.
  const scoutFetching = useIsFetching({ queryKey: ['scout', address] });
  const tipsFetching = useIsFetching({ queryKey: ['tips', address] });
  const isRefreshing = scoutFetching + tipsFetching > 0;

  // Detect fetching → done transition to trigger the success flash.
  const wasRefreshingRef = useRef(false);
  useEffect(() => {
    const wasRefreshing = wasRefreshingRef.current;
    wasRefreshingRef.current = isRefreshing;

    if (wasRefreshing && !isRefreshing && lastRefreshAt !== null) {
      // Avoid synchronous setState in effects (react-hooks/set-state-in-effect).
      window.setTimeout(() => setJustUpdated(true), 0);
      const t = window.setTimeout(() => setJustUpdated(false), 1500);
      return () => window.clearTimeout(t);
    }
  }, [isRefreshing, lastRefreshAt]);

  // Tick the cooldown countdown once per second.
  useEffect(() => {
    if (!lastRefreshAt || isRefreshing) return;
    const interval = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((COOLDOWN_MS - (Date.now() - lastRefreshAt)) / 1000),
      );
      setSecondsLeft(remaining);
      if (remaining === 0) setLastRefreshAt(null);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [lastRefreshAt, isRefreshing]);

  // Cooldown is active between the end of a fetch and COOLDOWN_MS later.
  const inCooldown = lastRefreshAt !== null && !isRefreshing;

  const refresh = useCallback(() => {
    if (isRefreshing || inCooldown) return;
    void queryClient.invalidateQueries({ queryKey: ['scout', address] });
    void queryClient.invalidateQueries({ queryKey: ['tips', address] });
    setLastRefreshAt(Date.now());
    setJustUpdated(false);
  }, [queryClient, address, isRefreshing, inCooldown]);

  return { refresh, isRefreshing, inCooldown, secondsLeft, justUpdated };
}
