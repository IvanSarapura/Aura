import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('wagmi', () => ({
  useConnect: vi.fn(),
  useAccount: vi.fn(),
}));

vi.mock('wagmi/connectors', () => ({
  injected: vi.fn(() => ({ id: 'mock-injected' })),
}));

import { useConnect, useAccount } from 'wagmi';
import { useMiniPay } from './useMiniPay';

type MiniPayWindow = Window & { ethereum?: { isMiniPay?: boolean } };

describe('useMiniPay', () => {
  const mockConnect = vi.fn();

  beforeEach(() => {
    mockConnect.mockReset();
    vi.mocked(useConnect).mockReturnValue({
      connect: mockConnect,
    } as unknown as ReturnType<typeof useConnect>);
    vi.mocked(useAccount).mockReturnValue({
      isConnected: false,
    } as unknown as ReturnType<typeof useAccount>);
    delete (window as MiniPayWindow).ethereum;
  });

  it('isMiniPay is false when window.ethereum is absent', () => {
    const { result } = renderHook(() => useMiniPay());
    expect(result.current.isMiniPay).toBe(false);
  });

  it('isMiniPay is false when window.ethereum.isMiniPay is false', () => {
    (window as MiniPayWindow).ethereum = { isMiniPay: false };
    const { result } = renderHook(() => useMiniPay());
    expect(result.current.isMiniPay).toBe(false);
  });

  it('isMiniPay is true when window.ethereum.isMiniPay is true', () => {
    (window as MiniPayWindow).ethereum = { isMiniPay: true };
    const { result } = renderHook(() => useMiniPay());
    expect(result.current.isMiniPay).toBe(true);
  });

  it('calls connect() when isMiniPay is true and not connected', () => {
    (window as MiniPayWindow).ethereum = { isMiniPay: true };
    renderHook(() => useMiniPay());
    expect(mockConnect).toHaveBeenCalledOnce();
    expect(mockConnect).toHaveBeenCalledWith({ connector: expect.anything() });
  });

  it('does not call connect() when already connected', () => {
    (window as MiniPayWindow).ethereum = { isMiniPay: true };
    vi.mocked(useAccount).mockReturnValue({
      isConnected: true,
    } as unknown as ReturnType<typeof useAccount>);
    renderHook(() => useMiniPay());
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('does not call connect() when not in MiniPay', () => {
    renderHook(() => useMiniPay());
    expect(mockConnect).not.toHaveBeenCalled();
  });
});
