import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ShareCard } from './ShareCard';

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ chainId: undefined })),
}));

const RECIPIENT = '0x1234567890123456789012345678901234567890';

const BASE_PROPS = {
  recipient: RECIPIENT,
  amountDisplay: '1.00',
  tokenSymbol: 'USDm',
  onReset: () => {},
} as const;

describe('ShareCard', () => {
  it('renders truncated recipient address', () => {
    render(<ShareCard {...BASE_PROPS} />);
    expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
  });

  it('renders amount with token symbol', () => {
    render(<ShareCard {...BASE_PROPS} amountDisplay="5.00" />);
    expect(screen.getByText('5.00 USDm')).toBeInTheDocument();
  });

  it('renders amount with EURm symbol', () => {
    render(
      <ShareCard {...BASE_PROPS} amountDisplay="5.00" tokenSymbol="EURm" />,
    );
    expect(screen.getByText('5.00 EURm')).toBeInTheDocument();
  });

  it('renders trust level when provided', () => {
    render(<ShareCard {...BASE_PROPS} trustLevel="High" />);
    expect(screen.getByText('🟢 High')).toBeInTheDocument();
  });

  it('renders Medium trust level', () => {
    render(<ShareCard {...BASE_PROPS} trustLevel="Medium" />);
    expect(screen.getByText('🟡 Medium')).toBeInTheDocument();
  });

  it('renders Low trust level', () => {
    render(<ShareCard {...BASE_PROPS} trustLevel="Low" />);
    expect(screen.getByText('🔴 Low')).toBeInTheDocument();
  });

  it('does not render trust row when trustLevel is omitted', () => {
    render(<ShareCard {...BASE_PROPS} />);
    expect(screen.queryByText('Trust')).not.toBeInTheDocument();
  });

  it('calls onReset when "Send another tip" is clicked', () => {
    const onReset = vi.fn();
    render(<ShareCard {...BASE_PROPS} onReset={onReset} />);
    fireEvent.click(screen.getByRole('button', { name: /send another tip/i }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('Farcaster share link points to warpcast.com', () => {
    render(<ShareCard {...BASE_PROPS} trustLevel="High" />);
    const link = screen.getByRole('link', { name: /farcaster/i });
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('warpcast.com'),
    );
  });

  it('X share link points to x.com/intent/tweet', () => {
    render(<ShareCard {...BASE_PROPS} trustLevel="High" />);
    const link = screen.getByRole('link', { name: /share on x/i });
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('x.com/intent/tweet'),
    );
  });

  it('share text includes amount, token symbol, and trust level', () => {
    render(
      <ShareCard
        {...BASE_PROPS}
        amountDisplay="2.50"
        tokenSymbol="USDm"
        trustLevel="Medium"
      />,
    );
    const farcasterLink = screen.getByRole('link', { name: /farcaster/i });
    const href = farcasterLink.getAttribute('href') ?? '';
    const decoded = decodeURIComponent(href);
    expect(decoded).toContain('2.50 USDm');
    expect(decoded).toContain('Medium');
  });

  it('share text reflects EURm symbol', () => {
    render(
      <ShareCard
        {...BASE_PROPS}
        amountDisplay="3.00"
        tokenSymbol="EURm"
        trustLevel="High"
      />,
    );
    const farcasterLink = screen.getByRole('link', { name: /farcaster/i });
    const decoded = decodeURIComponent(
      farcasterLink.getAttribute('href') ?? '',
    );
    expect(decoded).toContain('3.00 EURm');
  });

  it('renders Aura Ticket brand in receipt', () => {
    render(<ShareCard {...BASE_PROPS} />);
    expect(screen.getByText('Aura Ticket')).toBeInTheDocument();
  });

  it('shows shortened tip tx hash with ellipsis and full hash in title', () => {
    const tipTxHash =
      '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdead';
    render(<ShareCard {...BASE_PROPS} tipTxHash={tipTxHash} />);
    const link = screen.getByRole('link', { name: '0xdead...dead' });
    expect(link).toHaveAttribute('title', tipTxHash);
  });
});
