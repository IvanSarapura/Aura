import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { TxStatus } from './TxStatus';

const TX_HASH =
  '0xdeadbeefdeadbeefdeadbeefdeadbeef00000000000000000000000000000001' as `0x${string}`;

const CHAIN_WITH_EXPLORER = {
  blockExplorers: { default: { url: 'https://sepolia.etherscan.io' } },
} as unknown as Parameters<typeof TxStatus>[0]['chain'];

describe('TxStatus', () => {
  afterEach(cleanup);

  it('renders nothing when status is idle', () => {
    const { container } = render(<TxStatus status="idle" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows pending message', () => {
    render(<TxStatus status="pending" />);
    expect(
      screen.getByText(/esperando confirmación en tu wallet/i),
    ).toBeInTheDocument();
  });

  it('shows confirming message', () => {
    render(<TxStatus status="confirming" />);
    expect(
      screen.getByText(/esperando confirmación en la red/i),
    ).toBeInTheDocument();
  });

  it('shows success message', () => {
    render(<TxStatus status="success" />);
    expect(screen.getByText(/transferencia confirmada/i)).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<TxStatus status="error" />);
    expect(screen.getByText(/la transacción falló/i)).toBeInTheDocument();
  });

  it('shows error detail when error prop is provided', () => {
    render(
      <TxStatus
        status="error"
        error={new Error('Insufficient funds for gas')}
      />,
    );
    expect(screen.getByText('Insufficient funds for gas')).toBeInTheDocument();
  });

  it('uses shortMessage from viem errors when available', () => {
    const viemError = Object.assign(new Error('long technical message'), {
      shortMessage: 'Saldo insuficiente',
    });
    render(<TxStatus status="error" error={viemError} />);
    expect(screen.getByText('Saldo insuficiente')).toBeInTheDocument();
  });

  it('does not show error detail when status is not error', () => {
    render(<TxStatus status="success" error={new Error('should not show')} />);
    expect(screen.queryByText('should not show')).not.toBeInTheDocument();
  });

  it('shows explorer link when txHash and chain are provided', () => {
    render(
      <TxStatus
        status="success"
        txHash={TX_HASH}
        chain={CHAIN_WITH_EXPLORER}
      />,
    );
    const link = screen.getByRole('link', { name: /ver en explorador/i });
    expect(link).toHaveAttribute(
      'href',
      `https://sepolia.etherscan.io/tx/${TX_HASH}`,
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows raw txHash when no chain is provided', () => {
    render(<TxStatus status="confirming" txHash={TX_HASH} />);
    expect(screen.getByText(TX_HASH)).toBeInTheDocument();
  });

  it('does not render txHash section when txHash is not provided', () => {
    render(<TxStatus status="pending" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('has correct ARIA attributes for screen readers', () => {
    render(<TxStatus status="pending" />);
    const statusEl = screen.getByRole('status');
    expect(statusEl).toHaveAttribute('aria-live', 'polite');
    expect(statusEl).toHaveAttribute('aria-atomic', 'true');
  });
});
