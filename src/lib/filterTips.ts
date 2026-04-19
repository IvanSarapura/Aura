import type { TipEvent } from '@/lib/tipEvents';

export interface TipFilters {
  minAmount: string;
  maxAmount: string;
  category: string;
  peerAddress: string;
}

export const EMPTY_FILTERS: TipFilters = {
  minAmount: '',
  maxAmount: '',
  category: '',
  peerAddress: '',
};

export function hasActiveFilters(f: TipFilters): boolean {
  return (
    f.minAmount.trim() !== '' ||
    f.maxAmount.trim() !== '' ||
    f.category !== '' ||
    f.peerAddress.trim() !== ''
  );
}

export function deriveCategories(tips: TipEvent[]): string[] {
  const seen = new Set<string>();
  for (const tip of tips) {
    const cat = tip.category.trim();
    if (cat) seen.add(cat);
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

export function applyTipFilters(
  tips: TipEvent[],
  filters: TipFilters,
  type: 'received' | 'sent',
): TipEvent[] {
  const min = filters.minAmount.trim();
  const max = filters.maxAmount.trim();
  const category = filters.category.trim().toLowerCase();
  const peer = filters.peerAddress.trim().toLowerCase();

  if (!min && !max && !category && !peer) return tips;

  return tips.filter((tip) => {
    const amount = parseFloat(tip.amount);

    if (min !== '' && !isNaN(parseFloat(min)) && amount < parseFloat(min)) {
      return false;
    }
    if (max !== '' && !isNaN(parseFloat(max)) && amount > parseFloat(max)) {
      return false;
    }
    if (category && tip.category.trim().toLowerCase() !== category) {
      return false;
    }
    if (peer) {
      const peerAddress = type === 'received' ? tip.from : tip.to;
      if (!peerAddress.toLowerCase().startsWith(peer)) return false;
    }

    return true;
  });
}
