import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WalletInfo } from './WalletInfo';

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useBalance: vi.fn(),
}));

import { useAccount, useBalance } from 'wagmi';

const mockUseAccount = vi.mocked(useAccount);
const mockUseBalance = vi.mocked(useBalance);

function mockDisconnected() {
  mockUseAccount.mockReturnValue({
    isConnected: false,
    address: undefined,
    chain: undefined,
  } as unknown as ReturnType<typeof useAccount>);
  mockUseBalance.mockReturnValue({
    data: undefined,
  } as unknown as ReturnType<typeof useBalance>);
}

function mockConnected(
  overrides: {
    address?: string;
    chainName?: string;
    balance?: { formatted: string; symbol: string };
  } = {},
) {
  const {
    address = '0x1234567890abcdef1234567890abcdef12345678',
    chainName = 'Ethereum',
    balance,
  } = overrides;

  mockUseAccount.mockReturnValue({
    isConnected: true,
    address,
    chain: { id: 1, name: chainName },
  } as unknown as ReturnType<typeof useAccount>);
  mockUseBalance.mockReturnValue({
    data: balance ?? undefined,
  } as unknown as ReturnType<typeof useBalance>);
}

describe('WalletInfo', () => {
  it('shows disconnected message when no wallet is connected', () => {
    mockDisconnected();
    render(<WalletInfo />);

    expect(screen.getByText(/ninguna wallet conectada/i)).toBeInTheDocument();
  });

  it('shows wallet details when connected', () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    mockConnected({
      address,
      balance: { formatted: '1.23456789', symbol: 'ETH' },
    });

    render(<WalletInfo />);

    expect(screen.getByText(address)).toBeInTheDocument();
    expect(screen.getByText('Ethereum')).toBeInTheDocument();
    expect(screen.getByText('1.2346 ETH')).toBeInTheDocument();
  });

  it('shows loading text while balance is being fetched', () => {
    mockConnected();
    render(<WalletInfo />);

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });
});
