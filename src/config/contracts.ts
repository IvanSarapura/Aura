import { celo, celoSepolia } from 'viem/chains';
import type { Address } from 'viem';

export const CONTRACTS = {
  [celo.id]: {
    auraTip: (process.env.NEXT_PUBLIC_AURA_TIP_ADDRESS_MAINNET ??
      '0x0000000000000000000000000000000000000000') as Address,
  },
  [celoSepolia.id]: {
    auraTip: (process.env.NEXT_PUBLIC_AURA_TIP_ADDRESS_TESTNET ??
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

// ── Token registry ───────────────────────────────────────────────────────────

export interface TokenInfo {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
}

export const SUPPORTED_TOKENS: Record<SupportedChainId, readonly TokenInfo[]> =
  {
    [celo.id]: [
      {
        address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
        symbol: 'USDm',
        name: 'Mento Dollar',
        decimals: 18,
      },
      {
        address: '0xceba9300f2b948710d2653dd7b07f33a8b32118c',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      },
      {
        address: '0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
      },
    ],
    [celoSepolia.id]: [
      {
        address: (process.env.NEXT_PUBLIC_USDM_ADDRESS_TESTNET ??
          '0x0000000000000000000000000000000000000000') as Address,
        symbol: 'mUSDm',
        name: 'Mock USDm (testnet)',
        decimals: 18,
      },
    ],
  };

export function getSupportedTokens(
  chainId: SupportedChainId,
): readonly TokenInfo[] {
  return SUPPORTED_TOKENS[chainId];
}

export function getDefaultToken(chainId: SupportedChainId): TokenInfo {
  return SUPPORTED_TOKENS[chainId][0];
}
