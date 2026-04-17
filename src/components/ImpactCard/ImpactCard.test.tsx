import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ImpactCard } from './ImpactCard';
import type { ScoutResult } from '@/hooks/useScout';

const ADDRESS = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';

const BASE_RESULT: ScoutResult = {
  trustLevel: 'High',
  headline: 'Active contributor with strong on-chain history',
  tags: ['Veteran', 'DeFi User'],
  stats: {
    txCount: 150,
    usdmVolume: '500.00',
    lastActive: '2024-01-15T10:00:00Z',
    walletAge: '2022-03-01T00:00:00Z',
  },
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
});
