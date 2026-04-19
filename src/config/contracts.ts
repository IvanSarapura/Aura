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
  /** If false, shown in UI but not yet usable for tipping (e.g. wiring in progress). */
  tipEnabled?: boolean;
  /** If true, volume of this token is counted toward the stablecoin trust-score signal. */
  isStablecoin?: boolean;
}

export const SUPPORTED_TOKENS: Record<SupportedChainId, readonly TokenInfo[]> =
  {
    [celo.id]: [
      {
        address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
        symbol: 'USDm',
        name: 'Mento Dollar',
        decimals: 18,
        isStablecoin: true,
      },
      {
        address: '0xceba9300f2b948710d2653dd7b07f33a8b32118c',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        isStablecoin: true,
      },
      {
        address: '0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        isStablecoin: true,
      },
    ],
    [celoSepolia.id]: [
      {
        address: (process.env.NEXT_PUBLIC_USDM_ADDRESS_TESTNET ??
          '0x0000000000000000000000000000000000000000') as Address,
        symbol: 'mUSDm',
        name: 'Mock USDm (testnet)',
        decimals: 18,
        tipEnabled: true,
        isStablecoin: true,
      },
      {
        address: '0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b',
        symbol: 'USDm',
        name: 'Mento Dollar (testnet)',
        decimals: 18,
        tipEnabled: true,
        isStablecoin: true,
      },
      {
        address: '0xA99dC247d6b7B2E3ab48a1fEE101b83cD6aCd82a',
        symbol: 'EURm',
        name: 'Mento Euro (testnet)',
        decimals: 18,
        tipEnabled: true,
        isStablecoin: true,
      },
    ],
  };

export function getSupportedTokens(
  chainId: SupportedChainId,
): readonly TokenInfo[] {
  return SUPPORTED_TOKENS[chainId];
}

export function getDefaultToken(chainId: SupportedChainId): TokenInfo {
  const list = SUPPORTED_TOKENS[chainId];
  const firstTippable = list.find((t) => t.tipEnabled !== false);
  return firstTippable ?? list[0];
}

export function getStablecoinAddresses(chainId: SupportedChainId): Address[] {
  return SUPPORTED_TOKENS[chainId]
    .filter((t) => t.isStablecoin)
    .map((t) => t.address);
}
