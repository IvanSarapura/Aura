import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ImpactCard } from './ImpactCard';
import type { ScoutResult, AuraStats } from '@/hooks/useScout';

const ADDRESS = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';

const BASE_RESULT: ScoutResult = {
  trustLevel: 'High',
  headline: 'Active contributor with strong on-chain history',
  tags: ['Veteran', 'DeFi User'],
  isBuilder: false,
  stats: {
    txCount: 150,
    usdmVolume: '500.00',
    lastActive: '2024-01-15T10:00:00Z',
    walletAge: '2022-03-01T00:00:00Z',
  },
  auraStats: null,
};

const AURA_STATS: AuraStats = {
  tipsReceived: 5,
  tipsSent: 2,
  uniqueTippers: 3,
  topCategories: ['design', 'code'],
  totalVolumeReceived: '25.00',
};

describe('ImpactCard', () => {
  it('renders High trust badge', () => {
    render(<ImpactCard result={BASE_RESULT} address={ADDRESS} />);
    expect(screen.getByText('High Trust')).toBeInTheDocument();
  });

  it('renders truncated address', () => {
    render(<ImpactCard result={BASE_RESULT} address={ADDRESS} />);
    expect(screen.getByText('0xABCD…EF12')).toBeInTheDocument();
  });

  it('renders headline text', () => {
    render(<ImpactCard result={BASE_RESULT} address={ADDRESS} />);
    expect(screen.getByText(BASE_RESULT.headline)).toBeInTheDocument();
  });

  it('renders all tags', () => {
    render(<ImpactCard result={BASE_RESULT} address={ADDRESS} />);
    expect(screen.getByText('Veteran')).toBeInTheDocument();
    expect(screen.getByText('DeFi User')).toBeInTheDocument();
  });

  it('renders tx count and usdm volume stats', () => {
    render(<ImpactCard result={BASE_RESULT} address={ADDRESS} />);
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('$500.00')).toBeInTheDocument();
  });

  it('renders Medium trust badge', () => {
    render(
      <ImpactCard
        result={{ ...BASE_RESULT, trustLevel: 'Medium' }}
        address={ADDRESS}
      />,
    );
    expect(screen.getByText('Medium Trust')).toBeInTheDocument();
  });

  it('renders Low trust badge', () => {
    render(
      <ImpactCard
        result={{ ...BASE_RESULT, trustLevel: 'Low' }}
        address={ADDRESS}
      />,
    );
    expect(screen.getByText('Low Trust')).toBeInTheDocument();
  });

  // ── Aura Activity section ────────────────────────────────────────────────────

  it('renders Aura Activity section title', () => {
    render(<ImpactCard result={BASE_RESULT} address={ADDRESS} />);
    expect(screen.getByText('✦ Aura Activity')).toBeInTheDocument();
  });

  it('renders "No Aura activity yet" when auraStats is null', () => {
    render(<ImpactCard result={BASE_RESULT} address={ADDRESS} />);
    expect(screen.getByText('No Aura activity yet')).toBeInTheDocument();
  });

  it('renders tip counts when auraStats is provided', () => {
    render(
      <ImpactCard
        result={{ ...BASE_RESULT, auraStats: AURA_STATS }}
        address={ADDRESS}
      />,
    );
    // tipsReceived=5, tipsSent=2, uniqueTippers=3
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('$25.00')).toBeInTheDocument();
  });

  it('does not render "No Aura activity yet" when auraStats is provided', () => {
    render(
      <ImpactCard
        result={{ ...BASE_RESULT, auraStats: AURA_STATS }}
        address={ADDRESS}
      />,
    );
    expect(screen.queryByText('No Aura activity yet')).not.toBeInTheDocument();
  });

  it('renders top categories when present', () => {
    render(
      <ImpactCard
        result={{ ...BASE_RESULT, auraStats: AURA_STATS }}
        address={ADDRESS}
      />,
    );
    expect(screen.getByText('design')).toBeInTheDocument();
    expect(screen.getByText('code')).toBeInTheDocument();
  });

  it('does not render categories section when topCategories is empty', () => {
    render(
      <ImpactCard
        result={{
          ...BASE_RESULT,
          auraStats: { ...AURA_STATS, topCategories: [] },
        }}
        address={ADDRESS}
      />,
    );
    expect(screen.queryByText('Top categories')).not.toBeInTheDocument();
  });

  it('renders — for null lastActive and walletAge', () => {
    render(
      <ImpactCard
        result={{
          ...BASE_RESULT,
          stats: { ...BASE_RESULT.stats, lastActive: null, walletAge: null },
        }}
        address={ADDRESS}
      />,
    );
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });
});
