import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { TokenInfo } from './TokenInfo';
import { getSupportedChainNames } from '@/config/chains';

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useReadContract: vi.fn(),
}));

import { useAccount, useReadContract } from 'wagmi';

const mockUseAccount = vi.mocked(useAccount);
const mockUseReadContract = vi.mocked(useReadContract);

describe('TokenInfo', () => {
  afterEach(cleanup);

  it('renders nothing when wallet is not connected', () => {
    mockUseAccount.mockReturnValue({
      isConnected: false,
      chain: undefined,
    } as unknown as ReturnType<typeof useAccount>);
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useReadContract>);

    const { container } = render(<TokenInfo />);
    expect(container.firstChild).toBeNull();
  });

  it('shows switch-chain hint when on an unsupported network', () => {
    mockUseAccount.mockReturnValue({
      isConnected: true,
      chain: { id: 1, name: 'Ethereum' },
    } as unknown as ReturnType<typeof useAccount>);
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useReadContract>);

    render(<TokenInfo />);

    const hint = screen.getByText(/cambiá a una de estas redes/i);
    expect(hint).toBeInTheDocument();
    // El texto de redes soportadas debe venir de la fuente de verdad del boilerplate.
    // Si el proyecto agrega nuevas redes (p. ej. Optimism), este test debe adaptarse.
    expect(hint).toHaveTextContent(getSupportedChainNames());
  });

  it.each([
    { id: 11155111, name: 'Ethereum Sepolia' },
    { id: 84532, name: 'Base Sepolia' },
    { id: 43113, name: 'Avalanche Fuji' },
  ])('shows token data when connected to $name', ({ id, name }) => {
    mockUseAccount.mockReturnValue({
      isConnected: true,
      chain: { id, name },
    } as unknown as ReturnType<typeof useAccount>);

    let callIndex = 0;
    mockUseReadContract.mockImplementation(() => {
      const results = [
        { data: 'USD Coin', isLoading: false },
        { data: 'USDC', isLoading: false },
        { data: 6, isLoading: false },
      ];
      return results[callIndex++ % results.length] as unknown as ReturnType<
        typeof useReadContract
      >;
    });

    render(<TokenInfo />);

    expect(screen.getByText('USD Coin')).toBeInTheDocument();
    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });
});
