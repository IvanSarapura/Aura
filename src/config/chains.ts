import {
  celo,
  celoSepolia as celoSepoliaChain,
  base,
  baseSepolia,
} from 'viem/chains';

// RainbowKit registers baseSepolia (84532) in its chain-ID map so it inherits baseIcon automatically.
// celoSepolia (11142220) has no entry — RainbowKit falls back to iconUrl/iconBackground on the chain
// object itself. Mirroring RainbowKit's internal baseIcon/celoIcon pattern keeps the structure clean.
const celoIcon = {
  iconBackground: '#FCFF52',
  iconUrl:
    'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2228%22%20height%3D%2228%22%20fill%3D%22none%22%3E%3Ccircle%20cx%3D%2214%22%20cy%3D%2214%22%20r%3D%2214%22%20fill%3D%22%23FCFF52%22%2F%3E%3Cpath%20d%3D%22M21%207H7v14h14v-4.887h-2.325a5.126%205.126%200%200%201-4.664%203.023c-2.844%200-5.147-2.325-5.147-5.147-.003-2.822%202.303-5.125%205.147-5.125%202.102%200%203.904%201.28%204.704%203.104H21V7Z%22%20fill%3D%22%23000%22%2F%3E%3C%2Fsvg%3E',
};

export const celoSepolia = {
  ...celoSepoliaChain,
  name: 'Celo Sepolia',
  ...celoIcon,
};

// ⚠️  MiniPay testnet = Celo Sepolia (NOT Alfajores).
export const TESTNET_CHAINS = [celoSepolia, baseSepolia] as const;
export const MAINNET_CHAINS = [celo, base] as const;

// All chains registered so RainbowKit's chain modal offers switching.
// Primary chain (first in array) matches the active profile.
export const ALL_CHAINS = [celo, base, celoSepolia, baseSepolia] as const;
export const ALL_CHAINS_TESTNET_FIRST = [
  celoSepolia,
  baseSepolia,
  celo,
  base,
] as const;

export function getActiveChains(chainProfile?: 'testnet' | 'mainnet') {
  const profile =
    chainProfile ??
    (process.env.NEXT_PUBLIC_CHAIN_PROFILE === 'mainnet'
      ? 'mainnet'
      : 'testnet');
  return profile === 'mainnet' ? ALL_CHAINS : ALL_CHAINS_TESTNET_FIRST;
}

export function getExplorerUrl(chainId: number, txHash: string): string {
  if (chainId === celo.id) return `https://celoscan.io/tx/${txHash}`;
  if (chainId === base.id) return `https://basescan.org/tx/${txHash}`;
  if (chainId === baseSepolia.id)
    return `https://sepolia.basescan.org/tx/${txHash}`;
  return `https://celo-sepolia.blockscout.com/tx/${txHash}`;
}

export function getNetworkName(chainId: number): string {
  if (chainId === celo.id) return 'Celo Mainnet';
  if (chainId === base.id) return 'Base Mainnet';
  if (chainId === baseSepolia.id) return 'Base Sepolia';
  return 'Celo Sepolia';
}
