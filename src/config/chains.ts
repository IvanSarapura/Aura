import { celo, celoSepolia } from 'viem/chains';

// ⚠️  MiniPay testnet = Celo Sepolia (NOT Alfajores).
export const TESTNET_CHAINS = [celoSepolia] as const;
export const MAINNET_CHAINS = [celo] as const;

export function getActiveChains(chainProfile?: 'testnet' | 'mainnet') {
  const profile =
    chainProfile ??
    (process.env.NEXT_PUBLIC_CHAIN_PROFILE === 'mainnet'
      ? 'mainnet'
      : 'testnet');
  return profile === 'mainnet' ? MAINNET_CHAINS : TESTNET_CHAINS;
}

export function getExplorerUrl(chainId: number, txHash: string): string {
  return chainId === celo.id
    ? `https://celoscan.io/tx/${txHash}`
    : `https://celo-sepolia.blockscout.com/tx/${txHash}`;
}

export function getNetworkName(chainId: number): 'mainnet' | 'celoSepolia' {
  return chainId === celo.id ? 'mainnet' : 'celoSepolia';
}
