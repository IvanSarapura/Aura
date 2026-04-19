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
    // ── Mainnet token registry ───────────────────────────────────────────────
    [celo.id]: [
      // USD-pegged
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
      // Regional Mento stablecoins
      {
        address: '0xd8763cba276a3738e6de85b4b3bf5fded6d6ca73',
        symbol: 'EURm',
        name: 'Mento Euro',
        decimals: 18,
        isStablecoin: true,
      },
      {
        address: '0xe8537a3d056da446677b9e9d6c5db704eaab4787',
        symbol: 'BRLm',
        name: 'Mento Brazilian Real',
        decimals: 18,
        isStablecoin: true,
      },
      {
        address: '0x456a3D042C0DbD3db53D5489e98dFb038553B0d0',
        symbol: 'KESm',
        name: 'Mento Kenyan Shilling',
        decimals: 18,
        isStablecoin: true,
      },
      {
        address: '0x105d4A9306D2E55a71d2Eb95B81553AE1dC20d7B',
        symbol: 'PHPm',
        name: 'Mento Philippine Peso',
        decimals: 18,
        isStablecoin: true,
      },
      {
        address: '0x8a567e2ae79ca692bd748ab832081c45de4041ea',
        symbol: 'COPm',
        name: 'Mento Colombian Peso',
        decimals: 18,
        isStablecoin: true,
      },
      {
        address: '0x7175504C455076F15c04A2F90a8e352281F492F9',
        symbol: 'AUDm',
        name: 'Mento Australian Dollar',
        decimals: 18,
        isStablecoin: true,
      },
      {
        address: '0x4c35853A3B4e647fD266f4de678dCc8fEC410BF6',
        symbol: 'ZARm',
        name: 'Mento South African Rand',
        decimals: 18,
        isStablecoin: true,
      },
      {
        address: '0xfAeA5F3404bbA20D3cc2f8C4B0A888F55a3c7313',
        symbol: 'GHSm',
        name: 'Mento Ghanaian Cedi',
        decimals: 18,
        isStablecoin: true,
      },
      {
        address: '0xE2702Bd97ee33c88c8f6f92DA3B733608aa76F71',
        symbol: 'NGNm',
        name: 'Mento Nigerian Naira',
        decimals: 18,
        isStablecoin: true,
      },
      {
        address: '0xc45eCF20f3CD864B32D9794d6f76814aE8892e20',
        symbol: 'JPYm',
        name: 'Mento Japanese Yen',
        decimals: 18,
        isStablecoin: true,
      },
    ],
    // ── Testnet token registry (Celo Sepolia) ───────────────────────────────
    [celoSepolia.id]: [
      // USD-pegged
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
      // Regional Mento stablecoins — testnet deployments
      {
        address: '0xA99dC247d6b7B2E3ab48a1fEE101b83cD6aCd82a',
        symbol: 'EURm',
        name: 'Mento Euro (testnet)',
        decimals: 18,
        tipEnabled: true,
        isStablecoin: true,
      },
      {
        address: '0x2294298942fdc79417DE9E0D740A4957E0e7783a',
        symbol: 'BRLm',
        name: 'Mento Brazilian Real (testnet)',
        decimals: 18,
        tipEnabled: true,
        isStablecoin: true,
      },
      {
        address: '0xC7e4635651E3e3Af82b61d3E23c159438daE3BbF',
        symbol: 'KESm',
        name: 'Mento Kenyan Shilling (testnet)',
        decimals: 18,
        tipEnabled: true,
        isStablecoin: true,
      },
      {
        address: '0x0352976d940a2C3FBa0C3623198947Ee1d17869E',
        symbol: 'PHPm',
        name: 'Mento Philippine Peso (testnet)',
        decimals: 18,
        tipEnabled: true,
        isStablecoin: true,
      },
      {
        address: '0x5F8d55c3627d2dc0a2B4afa798f877242F382F67',
        symbol: 'COPm',
        name: 'Mento Colombian Peso (testnet)',
        decimals: 18,
        tipEnabled: true,
        isStablecoin: true,
      },
      {
        address: '0x5873Faeb42F3563dcD77F0fbbdA818E6d6DA3139',
        symbol: 'AUDm',
        name: 'Mento Australian Dollar (testnet)',
        decimals: 18,
        tipEnabled: true,
        isStablecoin: true,
      },
      {
        address: '0x10CCfB235b0E1Ed394bACE4560C3ed016697687e',
        symbol: 'ZARm',
        name: 'Mento South African Rand (testnet)',
        decimals: 18,
        tipEnabled: true,
        isStablecoin: true,
      },
      {
        address: '0x5e94B8C872bD47BC4255E60ECBF44D5E66e7401C',
        symbol: 'GHSm',
        name: 'Mento Ghanaian Cedi (testnet)',
        decimals: 18,
        tipEnabled: true,
        isStablecoin: true,
      },
      {
        address: '0x3d5ae86F34E2a82771496D140daFAEf3789dF888',
        symbol: 'NGNm',
        name: 'Mento Nigerian Naira (testnet)',
        decimals: 18,
        tipEnabled: true,
        isStablecoin: true,
      },
      {
        address: '0x85Bee67D435A39f7467a8a9DE34a5B73D25Df426',
        symbol: 'JPYm',
        name: 'Mento Japanese Yen (testnet)',
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
