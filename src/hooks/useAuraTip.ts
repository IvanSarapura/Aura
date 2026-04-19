'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import type { Address, Hash } from 'viem';
import { erc20Abi } from '@/abi/erc20';
import { auraTipAbi } from '@/abi/auraTip';
import { isSupportedChain, getContracts } from '@/config/contracts';
// ── MiniPay: fee abstraction imports ─────────────────────────────────────────
import { isMiniPayEnvironment } from '@/lib/isMiniPay';
import { getFeeCurrencyAddress } from '@/config/celoFeeCurrency';

export type TipPhase = 'idle' | 'approving' | 'tipping' | 'success' | 'error';

interface Params {
  recipient: Address;
  amountWei: bigint;
  tokenAddress: Address;
  category: string;
  message: string;
}

export function useAuraTip({
  recipient,
  amountWei,
  tokenAddress,
  category,
  message,
}: Params) {
  const { address, chainId } = useAccount();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<TipPhase>('idle');
  const [approveTxHash, setApproveTxHash] = useState<Hash | undefined>();
  const [tipTxHash, setTipTxHash] = useState<Hash | undefined>();
  const [errorMsg, setErrorMsg] = useState<string | undefined>();

  const contracts =
    chainId && isSupportedChain(chainId) ? getContracts(chainId) : null;

  // ── MiniPay: fee abstraction (CIP-42) ──────────────────────────────────────
  // Only active when running inside MiniPay on a Celo network. This lets users
  // pay gas in USDm instead of CELO. Left undefined on MetaMask / WalletConnect
  // so desktop behaviour is completely unchanged.
  const feeCurrency =
    isMiniPayEnvironment() && chainId
      ? getFeeCurrencyAddress(chainId)
      : undefined;

  const ready =
    !!address &&
    !!contracts &&
    amountWei > 0n &&
    tokenAddress !== '0x0000000000000000000000000000000000000000';

  // ── 1. Read current token allowance ─────────────────────────────────────
  const { data: allowance } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && contracts ? [address, contracts.auraTip] : undefined,
    query: { enabled: ready },
  });

  const needsApproval = !allowance || allowance < amountWei;

  // ── 2. Pre-flight simulations ────────────────────────────────────────────
  const { data: approveSim, error: approveSimErr } = useSimulateContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: contracts ? [contracts.auraTip, amountWei] : undefined,
    query: { enabled: ready && needsApproval && phase === 'idle' },
  });

  const { data: tipSim, error: tipSimErr } = useSimulateContract({
    address: contracts?.auraTip,
    abi: auraTipAbi,
    functionName: 'tip',
    args: [recipient, amountWei, tokenAddress, category, message],
    // Only pre-simulate tip when allowance is already sufficient; otherwise the
    // simulation will always revert with "insufficient allowance" and burn RPC calls.
    query: { enabled: ready && phase === 'idle' && !needsApproval },
  });

  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // ── 3. Wait for receipts ─────────────────────────────────────────────────
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });
  const { isSuccess: tipConfirmed } = useWaitForTransactionReceipt({
    hash: tipTxHash,
  });

  // ── 4. Phase transitions ─────────────────────────────────────────────────
  // After approval confirms, poll on-chain allowance before simulating tip.
  // RPC nodes on testnets can lag 1-2 blocks behind the confirmed tx, causing
  // the tip simulation to still see insufficient allowance — hence the retry loop.
  useEffect(() => {
    if (!approveConfirmed || phase !== 'approving') return;
    if (!contracts || !address || !publicClient) {
      setErrorMsg('Client not available');
      setPhase('error');
      return;
    }
    setPhase('tipping');

    const waitForAllowanceThenTip = async () => {
      const MAX_POLLS = 8;
      const POLL_INTERVAL_MS = 1500;

      for (let i = 0; i < MAX_POLLS; i++) {
        const onChainAllowance = await publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, contracts.auraTip],
        });
        if (onChainAllowance >= amountWei) break;
        if (i === MAX_POLLS - 1) {
          setErrorMsg('Approval not yet visible on-chain. Please try again.');
          setPhase('error');
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }

      try {
        const { request } = await publicClient.simulateContract({
          address: contracts.auraTip,
          abi: auraTipAbi,
          functionName: 'tip',
          args: [recipient, amountWei, tokenAddress, category, message],
          account: address,
          // ── MiniPay: include feeCurrency so gas is paid in stablecoin ──────
          ...(feeCurrency && { feeCurrency }),
        });
        // ── MiniPay: propagate feeCurrency from simulation into the write tx ─
        const hash = await writeContractAsync({
          ...request,
          ...(feeCurrency && { feeCurrency }),
        });
        setTipTxHash(hash);
      } catch (err) {
        handleError(err);
      }
    };

    waitForAllowanceThenTip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveConfirmed]);

  useEffect(() => {
    if (tipConfirmed && phase === 'tipping') {
      setPhase('success');
      // Refresh tip feed and scout card so new data appears immediately
      void queryClient.invalidateQueries({ queryKey: ['tips'] });
      void queryClient.invalidateQueries({ queryKey: ['scout', recipient] });
    }
  }, [tipConfirmed, phase, queryClient, recipient]);

  // ── 5. Submit ────────────────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (phase !== 'idle' || !ready) return;
    setErrorMsg(undefined);

    try {
      if (needsApproval) {
        if (!approveSim)
          throw new Error(
            'Approval simulation not ready — fill in a valid amount',
          );
        setPhase('approving');
        // ── MiniPay: spread feeCurrency onto the simulated request ────────────
        const hash = await writeContractAsync({
          ...approveSim.request,
          ...(feeCurrency && { feeCurrency }),
        });
        setApproveTxHash(hash);
      } else {
        if (!tipSim) throw new Error('Tip simulation not ready');
        setPhase('tipping');
        // ── MiniPay: spread feeCurrency onto the simulated request ────────────
        const hash = await writeContractAsync({
          ...tipSim.request,
          ...(feeCurrency && { feeCurrency }),
        });
        setTipTxHash(hash);
      }
    } catch (err) {
      handleError(err);
    }
  }, [phase, ready, needsApproval, approveSim, tipSim, writeContractAsync]);

  function handleError(err: unknown) {
    // viem wraps MetaMask errors — rejection code may live on err.cause or err.name
    const code = (err as { code?: number }).code;
    const causeCode = (err as { cause?: { code?: number } }).cause?.code;
    const isRejection =
      code === 4001 ||
      code === -32603 ||
      causeCode === 4001 ||
      causeCode === -32603 ||
      (err instanceof Error &&
        (err.name === 'UserRejectedRequestError' ||
          err.message.toLowerCase().includes('user rejected') ||
          err.message.toLowerCase().includes('user denied')));

    if (isRejection) {
      setPhase('idle');
      return;
    }
    setErrorMsg(err instanceof Error ? err.message : 'Transaction failed');
    setPhase('error');
  }

  const canSubmit =
    phase === 'idle' &&
    ready &&
    (needsApproval ? !!approveSim && !approveSimErr : !!tipSim && !tipSimErr);

  const reset = useCallback(() => {
    setPhase('idle');
    setApproveTxHash(undefined);
    setTipTxHash(undefined);
    setErrorMsg(undefined);
  }, []);

  return {
    phase,
    approveTxHash,
    tipTxHash,
    errorMsg,
    canSubmit,
    needsApproval,
    submit,
    reset,
  };
}
