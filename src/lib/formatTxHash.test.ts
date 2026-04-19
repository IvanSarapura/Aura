import { describe, it, expect } from 'vitest';
import { formatTxHashDisplay } from './formatTxHash';

describe('formatTxHashDisplay', () => {
  it('formats a standard 32-byte hash with ellipsis', () => {
    const hash =
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    expect(formatTxHashDisplay(hash)).toBe('0xaaaa...aaaa');
  });

  it('formats a 20-byte address like a tx hash', () => {
    expect(
      formatTxHashDisplay('0x1234567890123456789012345678901234567890'),
    ).toBe('0x1234...7890');
  });

  it('returns the full string when length fits head+tail without a middle gap', () => {
    expect(formatTxHashDisplay('0x12345678')).toBe('0x12345678');
  });

  it('truncates when there is at least one omitted character between head and tail', () => {
    expect(formatTxHashDisplay('0x1234567890')).toBe('0x1234...7890');
  });

  it('trims whitespace', () => {
    const hash =
      '  0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb  ';
    expect(formatTxHashDisplay(hash)).toBe('0xbbbb...bbbb');
  });

  it('respects custom head/tail lengths', () => {
    const hash =
      '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';
    expect(formatTxHashDisplay(hash, { headBodyChars: 2, tailChars: 2 })).toBe(
      '0xcc...cc',
    );
  });
});
