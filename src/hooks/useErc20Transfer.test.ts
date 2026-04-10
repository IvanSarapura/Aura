import { renderHook, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useErc20Transfer } from './useErc20Transfer';

vi.mock('wagmi', () => ({
  useSimulateContract: vi.fn(),
  useWriteContract: vi.fn(),
  useWaitForTransactionReceipt: vi.fn(),
}));

import {
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';

const mockUseSimulateContract = vi.mocked(useSimulateContract);
const mockUseWriteContract = vi.mocked(useWriteContract);
const mockUseWaitForTransactionReceipt = vi.mocked(
  useWaitForTransactionReceipt,
);

const CONTRACT_ADDRESS =
  '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as `0x${string}`;
const DEST_ADDRESS =
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as `0x${string}`;

const BASE_PARAMS = {
  contractAddress: CONTRACT_ADDRESS,
  decimals: 6,
  to: DEST_ADDRESS,
  amount: '10',
};

function mockAll({
  simulate = {},
  write = {},
  receipt = {},
}: {
  simulate?: Record<string, unknown>;
  write?: Record<string, unknown>;
  receipt?: Record<string, unknown>;
} = {}) {
  mockUseSimulateContract.mockReturnValue({
    data: undefined,
    error: null,
    isLoading: false,
    ...simulate,
  } as unknown as ReturnType<typeof useSimulateContract>);

  mockUseWriteContract.mockReturnValue({
    writeContract: vi.fn(),
    data: undefined,
    isPending: false,
    error: null,
    reset: vi.fn(),
    ...write,
  } as unknown as ReturnType<typeof useWriteContract>);

  mockUseWaitForTransactionReceipt.mockReturnValue({
    isLoading: false,
    isSuccess: false,
    data: undefined,
    error: null,
    ...receipt,
  } as unknown as ReturnType<typeof useWaitForTransactionReceipt>);
}

describe('useErc20Transfer', () => {
  afterEach(cleanup);

  describe('status', () => {
    it('returns idle when simulation has no result', () => {
      mockAll();
      const { result } = renderHook(() => useErc20Transfer(BASE_PARAMS));
      expect(result.current.status).toBe('idle');
    });

    it('returns pending while waiting for wallet signature', () => {
      mockAll({ write: { isPending: true } });
      const { result } = renderHook(() => useErc20Transfer(BASE_PARAMS));
      expect(result.current.status).toBe('pending');
    });

    it('returns confirming while waiting for receipt', () => {
      mockAll({
        write: { data: '0xabc' as `0x${string}` },
        receipt: { isLoading: true },
      });
      const { result } = renderHook(() => useErc20Transfer(BASE_PARAMS));
      expect(result.current.status).toBe('confirming');
    });

    it('returns success when receipt is confirmed', () => {
      mockAll({
        receipt: {
          isSuccess: true,
          data: { status: 'success' } as unknown as ReturnType<
            typeof useWaitForTransactionReceipt
          >['data'],
        },
      });
      const { result } = renderHook(() => useErc20Transfer(BASE_PARAMS));
      expect(result.current.status).toBe('success');
    });

    it('returns error when user rejects the tx', () => {
      mockAll({ write: { error: new Error('User rejected') } });
      const { result } = renderHook(() => useErc20Transfer(BASE_PARAMS));
      expect(result.current.status).toBe('error');
    });

    it('returns error when tx reverts on-chain', () => {
      mockAll({
        write: { data: '0xabc' as `0x${string}` },
        receipt: {
          isSuccess: false,
          data: { status: 'reverted' } as unknown as ReturnType<
            typeof useWaitForTransactionReceipt
          >['data'],
        },
      });
      const { result } = renderHook(() => useErc20Transfer(BASE_PARAMS));
      expect(result.current.status).toBe('error');
      expect(result.current.error?.message).toMatch(/revertida/i);
    });

    it('returns error when receipt hook fails', () => {
      mockAll({ receipt: { error: new Error('Network error') } });
      const { result } = renderHook(() => useErc20Transfer(BASE_PARAMS));
      expect(result.current.status).toBe('error');
      expect(result.current.error?.message).toBe('Network error');
    });
  });

  describe('simulateError', () => {
    it('exposes simulation errors separately from tx errors', () => {
      const simulateError = new Error('ERC20: transfer amount exceeds balance');
      mockAll({ simulate: { error: simulateError } });
      const { result } = renderHook(() => useErc20Transfer(BASE_PARAMS));
      expect(result.current.simulateError?.message).toBe(
        'ERC20: transfer amount exceeds balance',
      );
      // La simulación no debe cambiar el status de la tx
      expect(result.current.status).toBe('idle');
    });
  });

  describe('canExecute', () => {
    it('is false when simulation has no request', () => {
      mockAll();
      const { result } = renderHook(() => useErc20Transfer(BASE_PARAMS));
      expect(result.current.canExecute).toBe(false);
    });

    it('is true when simulation succeeds and tx is not active', () => {
      mockAll({
        simulate: {
          data: {
            request: { address: CONTRACT_ADDRESS },
          } as unknown as ReturnType<typeof useSimulateContract>['data'],
        },
      });
      const { result } = renderHook(() => useErc20Transfer(BASE_PARAMS));
      expect(result.current.canExecute).toBe(true);
    });

    it('is false while tx is pending (awaiting signature)', () => {
      mockAll({
        simulate: {
          data: {
            request: { address: CONTRACT_ADDRESS },
          } as unknown as ReturnType<typeof useSimulateContract>['data'],
        },
        write: { isPending: true },
      });
      const { result } = renderHook(() => useErc20Transfer(BASE_PARAMS));
      expect(result.current.canExecute).toBe(false);
    });

    it('is false while tx is confirming', () => {
      mockAll({
        simulate: {
          data: {
            request: { address: CONTRACT_ADDRESS },
          } as unknown as ReturnType<typeof useSimulateContract>['data'],
        },
        write: { data: '0xabc' as `0x${string}` },
        receipt: { isLoading: true },
      });
      const { result } = renderHook(() => useErc20Transfer(BASE_PARAMS));
      expect(result.current.canExecute).toBe(false);
    });
  });

  describe('execute', () => {
    it('does nothing when canExecute is false', () => {
      const writeContract = vi.fn();
      mockAll({ write: { writeContract } });
      const { result } = renderHook(() => useErc20Transfer(BASE_PARAMS));
      result.current.execute();
      expect(writeContract).not.toHaveBeenCalled();
    });

    it('calls writeContract with the simulated request', () => {
      const writeContract = vi.fn();
      const request = { address: CONTRACT_ADDRESS, functionName: 'transfer' };
      mockAll({
        simulate: {
          data: { request } as unknown as ReturnType<
            typeof useSimulateContract
          >['data'],
        },
        write: { writeContract },
      });
      const { result } = renderHook(() => useErc20Transfer(BASE_PARAMS));
      result.current.execute();
      expect(writeContract).toHaveBeenCalledWith(request);
    });
  });

  describe('txHash', () => {
    it('is undefined initially', () => {
      mockAll();
      const { result } = renderHook(() => useErc20Transfer(BASE_PARAMS));
      expect(result.current.txHash).toBeUndefined();
    });

    it('is set after the tx is signed', () => {
      const txHash = '0xdeadbeef' as `0x${string}`;
      mockAll({ write: { data: txHash } });
      const { result } = renderHook(() => useErc20Transfer(BASE_PARAMS));
      expect(result.current.txHash).toBe(txHash);
    });
  });
});
