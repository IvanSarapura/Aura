import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useReadContract: vi.fn(),
  useSimulateContract: vi.fn(),
  useWriteContract: vi.fn(),
  useWaitForTransactionReceipt: vi.fn(),
}));

import {
  useAccount,
  useReadContract,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { useAuraTip } from './useAuraTip';

// celoSepolia.id per viem/chains (NOT Alfajores/44787 — MiniPay testnet is Celo Sepolia)
const CELO_SEPOLIA_ID = 11142220;
const MOCK_ADDRESS = '0x1111111111111111111111111111111111111111' as const;
const MOCK_RECIPIENT = '0x2222222222222222222222222222222222222222' as const;

const DEFAULT_PARAMS = {
  recipient: MOCK_RECIPIENT,
  amountWei: 1_000_000_000_000_000_000n,
  category: 'thanks',
  message: '',
};

const APPROVE_REQUEST = { mock: 'approve-request' };
const TIP_REQUEST = { mock: 'tip-request' };

function setupConnectedMocks({
  allowance = 0n,
  writeContractAsync = vi.fn(),
  approveConfirmedHash = undefined as string | undefined,
  tipConfirmedHash = undefined as string | undefined,
} = {}) {
  vi.mocked(useAccount).mockReturnValue({
    address: MOCK_ADDRESS,
    chainId: CELO_SEPOLIA_ID,
  } as unknown as ReturnType<typeof useAccount>);

  vi.mocked(useReadContract).mockReturnValue({
    data: allowance,
  } as unknown as ReturnType<typeof useReadContract>);

  vi.mocked(useSimulateContract).mockImplementation(
    (params = {}) =>
      ({
        data:
          (params as { functionName?: string }).functionName === 'approve'
            ? { request: APPROVE_REQUEST }
            : { request: TIP_REQUEST },
        error: null,
      }) as unknown as ReturnType<typeof useSimulateContract>,
  );

  vi.mocked(useWriteContract).mockReturnValue({
    writeContractAsync,
  } as unknown as ReturnType<typeof useWriteContract>);

  vi.mocked(useWaitForTransactionReceipt).mockImplementation(
    (params = {}) =>
      ({
        isSuccess:
          (params as { hash?: string }).hash === approveConfirmedHash ||
          (params as { hash?: string }).hash === tipConfirmedHash,
      }) as unknown as ReturnType<typeof useWaitForTransactionReceipt>,
  );
}

describe('useAuraTip', () => {
  beforeEach(() => {
    vi.mocked(useAccount).mockReturnValue({
      address: undefined,
      chainId: undefined,
    } as unknown as ReturnType<typeof useAccount>);
    vi.mocked(useReadContract).mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useReadContract>);
    vi.mocked(useSimulateContract).mockReturnValue({
      data: undefined,
      error: null,
    } as unknown as ReturnType<typeof useSimulateContract>);
    vi.mocked(useWriteContract).mockReturnValue({
      writeContractAsync: vi.fn(),
    } as unknown as ReturnType<typeof useWriteContract>);
    vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
      isSuccess: false,
    } as unknown as ReturnType<typeof useWaitForTransactionReceipt>);
  });

  it('starts in idle phase', () => {
    const { result } = renderHook(() => useAuraTip(DEFAULT_PARAMS));
    expect(result.current.phase).toBe('idle');
  });

  it('canSubmit is false when wallet not connected', () => {
    const { result } = renderHook(() => useAuraTip(DEFAULT_PARAMS));
    expect(result.current.canSubmit).toBe(false);
  });

  it('canSubmit is false when amountWei is 0', () => {
    setupConnectedMocks();
    const { result } = renderHook(() =>
      useAuraTip({ ...DEFAULT_PARAMS, amountWei: 0n }),
    );
    expect(result.current.canSubmit).toBe(false);
  });

  it('needsApproval is true when allowance < amountWei', () => {
    setupConnectedMocks({ allowance: 0n });
    const { result } = renderHook(() => useAuraTip(DEFAULT_PARAMS));
    expect(result.current.needsApproval).toBe(true);
  });

  it('needsApproval is false when allowance >= amountWei', () => {
    setupConnectedMocks({ allowance: 2_000_000_000_000_000_000n });
    const { result } = renderHook(() => useAuraTip(DEFAULT_PARAMS));
    expect(result.current.needsApproval).toBe(false);
  });

  it('canSubmit is true when connected with approve sim ready', () => {
    setupConnectedMocks({ allowance: 0n });
    const { result } = renderHook(() => useAuraTip(DEFAULT_PARAMS));
    expect(result.current.canSubmit).toBe(true);
  });

  it('reset() clears phase, hashes, and error', () => {
    setupConnectedMocks();
    const { result } = renderHook(() => useAuraTip(DEFAULT_PARAMS));
    act(() => result.current.reset());
    expect(result.current.phase).toBe('idle');
    expect(result.current.approveTxHash).toBeUndefined();
    expect(result.current.tipTxHash).toBeUndefined();
    expect(result.current.errorMsg).toBeUndefined();
  });

  it('transitions idle → approving and stores approveTxHash', async () => {
    const writeContractAsync = vi.fn().mockResolvedValue('0xapprove-hash');
    setupConnectedMocks({ allowance: 0n, writeContractAsync });

    const { result } = renderHook(() => useAuraTip(DEFAULT_PARAMS));
    expect(result.current.phase).toBe('idle');

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.phase).toBe('approving');
    expect(result.current.approveTxHash).toBe('0xapprove-hash');
    expect(writeContractAsync).toHaveBeenCalledWith(APPROVE_REQUEST);
  });

  it('idle → tipping (no approval needed) and stores tipTxHash', async () => {
    // When allowance >= amount, submit skips approve and goes straight to tipping
    const writeContractAsync = vi.fn().mockResolvedValue('0xtip-hash');
    setupConnectedMocks({
      allowance: 2_000_000_000_000_000_000n, // 2 USDm ≥ 1 USDm → no approval needed
      writeContractAsync,
    });

    const { result } = renderHook(() => useAuraTip(DEFAULT_PARAMS));
    expect(result.current.needsApproval).toBe(false);

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.phase).toBe('tipping');
    expect(result.current.tipTxHash).toBe('0xtip-hash');
    expect(writeContractAsync).toHaveBeenCalledWith(TIP_REQUEST);
  });

  it('tipping → success when tip receipt confirmed', async () => {
    const writeContractAsync = vi.fn().mockResolvedValue('0xtip-hash');

    vi.mocked(useAccount).mockReturnValue({
      address: MOCK_ADDRESS,
      chainId: CELO_SEPOLIA_ID,
    } as unknown as ReturnType<typeof useAccount>);
    vi.mocked(useReadContract).mockReturnValue({
      data: 2_000_000_000_000_000_000n,
    } as unknown as ReturnType<typeof useReadContract>);
    vi.mocked(useSimulateContract).mockImplementation(
      (params = {}) =>
        ({
          data:
            (params as { functionName?: string }).functionName === 'approve'
              ? { request: APPROVE_REQUEST }
              : { request: TIP_REQUEST },
          error: null,
        }) as unknown as ReturnType<typeof useSimulateContract>,
    );
    vi.mocked(useWriteContract).mockReturnValue({
      writeContractAsync,
    } as unknown as ReturnType<typeof useWriteContract>);
    vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
      isSuccess: false,
    } as unknown as ReturnType<typeof useWaitForTransactionReceipt>);

    const { result, rerender } = renderHook(() => useAuraTip(DEFAULT_PARAMS));

    // Submit → tipping (no approval needed)
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.phase).toBe('tipping');

    // Simulate on-chain confirmation
    vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
      isSuccess: true,
    } as unknown as ReturnType<typeof useWaitForTransactionReceipt>);
    rerender();
    await waitFor(() => expect(result.current.phase).toBe('success'));
  });

  it('transitions to error phase on user rejection (code 4001)', async () => {
    const err = Object.assign(new Error('User rejected'), { code: 4001 });
    const writeContractAsync = vi.fn().mockRejectedValue(err);
    setupConnectedMocks({ allowance: 0n, writeContractAsync });

    const { result } = renderHook(() => useAuraTip(DEFAULT_PARAMS));
    await act(async () => {
      await result.current.submit();
    });

    // User rejection silently returns to idle, not error
    expect(result.current.phase).toBe('idle');
  });

  it('sets error phase and message on unexpected failure', async () => {
    const writeContractAsync = vi
      .fn()
      .mockRejectedValue(new Error('insufficient funds'));
    setupConnectedMocks({ allowance: 0n, writeContractAsync });

    const { result } = renderHook(() => useAuraTip(DEFAULT_PARAMS));
    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.phase).toBe('error');
    expect(result.current.errorMsg).toBe('insufficient funds');
  });
});
