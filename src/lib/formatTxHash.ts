/** Chars after `0x` to keep in the head segment (visual: `0x` + this many hex digits). */
const DEFAULT_HEAD_BODY = 4;
const DEFAULT_TAIL = 4;

/**
 * Shortens a `0x`-prefixed EVM value for display (tx hash, wallet address, etc.),
 * e.g. `0xabcd...9f01`. Use full value in `href` / APIs; this is for labels only.
 */
export function formatTxHashDisplay(
  hash: string,
  options?: { headBodyChars?: number; tailChars?: number },
): string {
  const trimmed = hash.trim();
  if (!trimmed) return '';

  const headBody = options?.headBodyChars ?? DEFAULT_HEAD_BODY;
  const tailChars = options?.tailChars ?? DEFAULT_TAIL;
  const headTotal = trimmed.startsWith('0x') ? 2 + headBody : headBody;

  /* No middle segment to omit — show full hash (also avoids overlapping slices). */
  if (trimmed.length <= headTotal + tailChars) {
    return trimmed;
  }

  return `${trimmed.slice(0, headTotal)}...${trimmed.slice(-tailChars)}`;
}
