import { describe, it, expect } from 'vitest';
import {
  hasActiveFilters,
  deriveCategories,
  applyTipFilters,
  EMPTY_FILTERS,
} from './filterTips';
import type { TipEvent } from './tipEvents';

const addr = (n: number): `0x${string}` =>
  `0x${String(n).padStart(40, '0')}` as `0x${string}`;

function makeTip(overrides: Partial<TipEvent> = {}): TipEvent {
  return {
    from: addr(1),
    to: addr(2),
    token: addr(3),
    tokenSymbol: 'cUSD',
    amount: '5.00',
    category: 'Work',
    message: '',
    timestamp: '2026-01-01T00:00:00.000Z',
    txHash: '0xabc',
    ...overrides,
  };
}

const TIPS: TipEvent[] = [
  makeTip({ amount: '1.00', category: 'Work', from: addr(10), txHash: '0x1' }),
  makeTip({ amount: '5.00', category: 'Art', from: addr(20), txHash: '0x2' }),
  makeTip({ amount: '10.00', category: 'Work', from: addr(30), txHash: '0x3' }),
  makeTip({ amount: '0.50', category: 'Code', from: addr(40), txHash: '0x4' }),
];

// ── hasActiveFilters ──────────────────────────────────────────────────────────

describe('hasActiveFilters', () => {
  it('returns false for EMPTY_FILTERS', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it('returns true when minAmount is set', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, minAmount: '1' })).toBe(true);
  });

  it('returns true when category is set', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, category: 'Work' })).toBe(true);
  });

  it('returns true when peerAddress is set', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, peerAddress: '0x' })).toBe(
      true,
    );
  });

  it('returns false when all fields are whitespace', () => {
    expect(
      hasActiveFilters({
        minAmount: ' ',
        maxAmount: ' ',
        category: '',
        peerAddress: '  ',
      }),
    ).toBe(false);
  });
});

// ── deriveCategories ──────────────────────────────────────────────────────────

describe('deriveCategories', () => {
  it('returns sorted unique categories', () => {
    expect(deriveCategories(TIPS)).toEqual(['Art', 'Code', 'Work']);
  });

  it('returns empty array for empty tips', () => {
    expect(deriveCategories([])).toEqual([]);
  });

  it('deduplicates categories', () => {
    const tips = [makeTip({ category: 'Work' }), makeTip({ category: 'Work' })];
    expect(deriveCategories(tips)).toEqual(['Work']);
  });

  it('ignores blank categories', () => {
    const tips = [makeTip({ category: '' }), makeTip({ category: '  ' })];
    expect(deriveCategories(tips)).toEqual([]);
  });
});

// ── applyTipFilters ───────────────────────────────────────────────────────────

describe('applyTipFilters', () => {
  it('returns all tips when filters are empty', () => {
    expect(applyTipFilters(TIPS, EMPTY_FILTERS, 'received')).toHaveLength(4);
  });

  it('filters by minAmount', () => {
    const result = applyTipFilters(
      TIPS,
      { ...EMPTY_FILTERS, minAmount: '5' },
      'received',
    );
    expect(result.map((t) => t.amount)).toEqual(['5.00', '10.00']);
  });

  it('filters by maxAmount', () => {
    const result = applyTipFilters(
      TIPS,
      { ...EMPTY_FILTERS, maxAmount: '1' },
      'received',
    );
    expect(result.map((t) => t.amount)).toEqual(['1.00', '0.50']);
  });

  it('filters by min and max range', () => {
    const result = applyTipFilters(
      TIPS,
      { ...EMPTY_FILTERS, minAmount: '1', maxAmount: '5' },
      'received',
    );
    expect(result.map((t) => t.amount)).toEqual(['1.00', '5.00']);
  });

  it('filters by category (case-insensitive)', () => {
    const result = applyTipFilters(
      TIPS,
      { ...EMPTY_FILTERS, category: 'work' },
      'received',
    );
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.category === 'Work')).toBe(true);
  });

  it('filters by peerAddress (from) for received tips', () => {
    const result = applyTipFilters(
      TIPS,
      { ...EMPTY_FILTERS, peerAddress: addr(10) },
      'received',
    );
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe(addr(10));
  });

  it('filters by peerAddress (to) for sent tips', () => {
    const tips = [
      makeTip({ to: addr(99), txHash: '0xsent1' }),
      makeTip({ to: addr(55), txHash: '0xsent2' }),
    ];
    const result = applyTipFilters(
      tips,
      { ...EMPTY_FILTERS, peerAddress: addr(99) },
      'sent',
    );
    expect(result).toHaveLength(1);
    expect(result[0].to).toBe(addr(99));
  });

  it('partial address prefix match', () => {
    // addr(10..40) all share the prefix 0x + 38 zeros
    const result = applyTipFilters(
      TIPS,
      {
        ...EMPTY_FILTERS,
        peerAddress: '0x00000000000000000000000000000000000000',
      },
      'received',
    );
    expect(result).toHaveLength(4);
  });

  it('combines multiple filters with AND logic', () => {
    const result = applyTipFilters(
      TIPS,
      { minAmount: '1', maxAmount: '10', category: 'Work', peerAddress: '' },
      'received',
    );
    expect(result.map((t) => t.amount)).toEqual(['1.00', '10.00']);
  });

  it('returns empty array when no tips match', () => {
    const result = applyTipFilters(
      TIPS,
      { ...EMPTY_FILTERS, category: 'NonExistent' },
      'received',
    );
    expect(result).toHaveLength(0);
  });

  it('ignores invalid amount strings gracefully', () => {
    const result = applyTipFilters(
      TIPS,
      { ...EMPTY_FILTERS, minAmount: 'abc', maxAmount: 'xyz' },
      'received',
    );
    expect(result).toHaveLength(4);
  });
});
