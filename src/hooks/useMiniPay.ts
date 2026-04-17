'use client';

import { useEffect } from 'react';
import { useConnect, useAccount } from 'wagmi';
import { injected } from 'wagmi/connectors';

type MiniPayEthereum = { isMiniPay?: boolean };

export function useMiniPay() {
  const { connect } = useConnect();
  const { isConnected } = useAccount();

  // Derived synchronously — no state needed, avoids setState-in-effect lint error.
  // MiniPay injects window.ethereum.isMiniPay before React renders.
  const isMiniPay =
    typeof window !== 'undefined' &&
    !!(window as Window & { ethereum?: MiniPayEthereum }).ethereum?.isMiniPay;

  useEffect(() => {
    if (!isMiniPay || isConnected) return;
    // MiniPay exposes itself as MetaMask — use the injected MetaMask target
    connect({ connector: injected({ target: 'metaMask' }) });
  }, [isMiniPay, isConnected, connect]);

  return { isMiniPay };
}
