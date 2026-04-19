import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ShareCard } from './ShareCard';

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ chainId: undefined })),
}));

const RECIPIENT = '0x1234567890123456789012345678901234567890';

describe('ShareCard', () => {
  it('renders truncated recipient address', () => {
    render(
      <ShareCard
        recipient={RECIPIENT}
        amountDisplay="1.00"
        onReset={() => {}}
      />,
    );
    expect(screen.getByText('0x1234…7890')).toBeInTheDocument();
  });

  it('renders amount with USDm label', () => {
    render(
      <ShareCard
        recipient={RECIPIENT}
        amountDisplay="5.00"
        onReset={() => {}}
      />,
    );
    expect(screen.getByText('5.00 USDm')).toBeInTheDocument();
  });

  it('renders trust level when provided', () => {
    render(
      <ShareCard
        recipient={RECIPIENT}
        amountDisplay="1.00"
        trustLevel="High"
        onReset={() => {}}
      />,
    );
    expect(screen.getByText('🟢 High')).toBeInTheDocument();
  });

  it('renders Medium trust level', () => {
    render(
      <ShareCard
        recipient={RECIPIENT}
        amountDisplay="1.00"
        trustLevel="Medium"
        onReset={() => {}}
      />,
    );
    expect(screen.getByText('🟡 Medium')).toBeInTheDocument();
  });

  it('renders Low trust level', () => {
    render(
      <ShareCard
        recipient={RECIPIENT}
        amountDisplay="1.00"
        trustLevel="Low"
        onReset={() => {}}
      />,
    );
    expect(screen.getByText('🔴 Low')).toBeInTheDocument();
  });

  it('does not render trust row when trustLevel is omitted', () => {
    render(
      <ShareCard
        recipient={RECIPIENT}
        amountDisplay="1.00"
        onReset={() => {}}
      />,
    );
    expect(screen.queryByText('Trust')).not.toBeInTheDocument();
  });

  it('calls onReset when "Send another tip" is clicked', () => {
    const onReset = vi.fn();
    render(
      <ShareCard
        recipient={RECIPIENT}
        amountDisplay="1.00"
        onReset={onReset}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /send another tip/i }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('Farcaster share link points to warpcast.com', () => {
    render(
      <ShareCard
        recipient={RECIPIENT}
        amountDisplay="1.00"
        trustLevel="High"
        onReset={() => {}}
      />,
    );
    const link = screen.getByRole('link', { name: /farcaster/i });
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('warpcast.com'),
    );
  });

  it('X share link points to x.com/intent/tweet', () => {
    render(
      <ShareCard
        recipient={RECIPIENT}
        amountDisplay="1.00"
        trustLevel="High"
        onReset={() => {}}
      />,
    );
    const link = screen.getByRole('link', { name: /share on x/i });
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('x.com/intent/tweet'),
    );
  });

  it('share text includes amount and trust level', () => {
    render(
      <ShareCard
        recipient={RECIPIENT}
        amountDisplay="2.50"
        trustLevel="Medium"
        onReset={() => {}}
      />,
    );
    const farcasterLink = screen.getByRole('link', { name: /farcaster/i });
    const href = farcasterLink.getAttribute('href') ?? '';
    const decoded = decodeURIComponent(href);
    expect(decoded).toContain('2.50 USDm');
    expect(decoded).toContain('Medium');
  });

  it('renders Aura brand in receipt', () => {
    render(
      <ShareCard
        recipient={RECIPIENT}
        amountDisplay="1.00"
        onReset={() => {}}
      />,
    );
    expect(screen.getByText('Aura')).toBeInTheDocument();
  });
});
