'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useAccount,
  useReadContract,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import type { Address, Hash } from 'viem';
import { erc20Abi } from '@/abi/erc20';
import { auraTipAbi } from '@/abi/auraTip';
import { isSupportedChain, getContracts } from '@/config/contracts';

export type TipPhase = 'idle' | 'approving' | 'tipping' | 'success' | 'error';

interface Params {
  recipient: Address;
  amountWei: bigint;
  category: string;
  message: string;
}

export function useAuraTip({
  recipient,
  amountWei,
  category,
  message,
}: Params) {
  const { address, chainId } = useAccount();
  const [phase, setPhase] = useState<TipPhase>('idle');
  const [approveTxHash, setApproveTxHash] = useState<Hash | undefined>();
  const [tipTxHash, setTipTxHash] = useState<Hash | undefined>();
  const [errorMsg, setErrorMsg] = useState<string | undefined>();

  // Guard: only work when wallet is connected and on a supported chain
  const contracts =
    chainId && isSupportedChain(chainId) ? getContracts(chainId) : null;
  const ready = !!address && !!contracts && amountWei > 0n;

  // ── 1. Read current USDm allowance ──────────────────────────────────────
  const { data: allowance } = useReadContract({
    address: contracts?.usdm,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && contracts ? [address, contracts.auraTip] : undefined,
    query: { enabled: ready },
  });

  const needsApproval = !allowance || allowance < amountWei;

  // ── 2. Pre-flight simulations (run in background while user fills form) ──
  const { data: approveSim, error: approveSimErr } = useSimulateContract({
    address: contracts?.usdm,
    abi: erc20Abi,
    functionName: 'approve',
    args: contracts ? [contracts.auraTip, amountWei] : undefined,
    query: { enabled: ready && needsApproval && phase === 'idle' },
  });

  const { data: tipSim, error: tipSimErr } = useSimulateContract({
    address: contracts?.auraTip,
    abi: auraTipAbi,
    functionName: 'tip',
    args: [recipient, amountWei, category, message],
    query: { enabled: ready && phase === 'idle' },
  });

  // Store the latest tipSim in a ref so the approve→tip effect always has it
  const tipSimRef = useRef(tipSim);
  useEffect(() => {
    tipSimRef.current = tipSim;
  }, [tipSim]);

  const { writeContractAsync } = useWriteContract();

  // ── 3. Wait for receipts ────────────────────────────────────────────────
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });
  const { isSuccess: tipConfirmed } = useWaitForTransactionReceipt({
    hash: tipTxHash,
  });

  // ── 4. Phase transitions ─────────────────────────────────────────────────
  // After approve confirms → execute tip
  useEffect(() => {
    if (!approveConfirmed || phase !== 'approving') return;
    const sim = tipSimRef.current;
    if (!sim) {
      setErrorMsg('Tip simulation unavailable');
      setPhase('error');
      return;
    }

    setPhase('tipping');
    writeContractAsync(sim.request).then(setTipTxHash).catch(handleError);
    // Intentional: only re-run when approveConfirmed flips to true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveConfirmed]);

  // After tip confirms → success
  useEffect(() => {
    if (tipConfirmed && phase === 'tipping') setPhase('success');
  }, [tipConfirmed, phase]);

  // ── 5. Submit ─────────────────────────────────────────────────────────────
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
        const hash = await writeContractAsync(approveSim.request);
        setApproveTxHash(hash);
      } else {
        if (!tipSim) throw new Error('Tip simulation not ready');
        setPhase('tipping');
        const hash = await writeContractAsync(tipSim.request);
        setTipTxHash(hash);
      }
    } catch (err) {
      handleError(err);
    }
  }, [phase, ready, needsApproval, approveSim, tipSim, writeContractAsync]);

  function handleError(err: unknown) {
    // User rejected — return to idle silently
    const code = (err as { code?: number }).code;
    if (code === 4001 || code === -32603) {
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
