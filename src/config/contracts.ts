import { celo, celoSepolia } from 'viem/chains';
import type { Address } from 'viem';

// AuraTip addresses are filled after deployment (Phase 1).
// USDm = Mento Dollar (formerly "cUSD"). Mainnet address unchanged; Celo Sepolia has a new address.
export const CONTRACTS = {
  [celo.id]: {
    auraTip: (process.env.NEXT_PUBLIC_AURA_TIP_ADDRESS_MAINNET ??
      '0x0000000000000000000000000000000000000000') as Address,
    usdm: '0x765DE816845861e75A25fCA122bb6898B8B1282a' as Address,
  },
  [celoSepolia.id]: {
    auraTip: (process.env.NEXT_PUBLIC_AURA_TIP_ADDRESS_TESTNET ??
      '0x0000000000000000000000000000000000000000') as Address,
    // MockUSDm deployed during testnet deploy — set NEXT_PUBLIC_USDM_ADDRESS_TESTNET after deploy
    usdm: (process.env.NEXT_PUBLIC_USDM_ADDRESS_TESTNET ??
      '0x0000000000000000000000000000000000000000') as Address,
  },
} as const;

export type SupportedChainId = keyof typeof CONTRACTS;

export function isSupportedChain(chainId: number): chainId is SupportedChainId {
  return chainId in CONTRACTS;
}

export function getContracts(chainId: SupportedChainId) {
  return CONTRACTS[chainId];
}
