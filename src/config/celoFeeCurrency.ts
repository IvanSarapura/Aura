// ── MiniPay: fee abstraction (CIP-42) ────────────────────────────────────────
// On Celo networks, MiniPay can pay gas fees in a stablecoin instead of CELO.
// This helper returns the feeCurrency address for a given chain, or undefined
// for non-Celo chains where fee abstraction is not supported.
//
// ⚠ If the user has no balance of this token, the tx will fail with an
//   "insufficient fee currency balance" error from the Celo node.

import { celo, celoSepolia } from 'viem/chains';
import type { Address } from 'viem';

// ── MiniPay: fee token addresses ─────────────────────────────────────────────
const FEE_CURRENCY: Record<number, Address> = {
  // Celo mainnet — Mento USDm (CIP-42 registered stablecoin)
  [celo.id]: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  // Celo Sepolia testnet — Mento USDm testnet deployment
  [celoSepolia.id]: '0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b',
};

export function getFeeCurrencyAddress(chainId: number): Address | undefined {
  return FEE_CURRENCY[chainId];
}
