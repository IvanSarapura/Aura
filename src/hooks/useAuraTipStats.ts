import { useReadContracts } from 'wagmi';
import type { Address } from 'viem';
import { celo, celoSepolia } from 'viem/chains';
import { auraTipAbi } from '@/abi/auraTip';
import { CONTRACTS } from '@/config/contracts';
import type { SupportedChainId } from '@/config/contracts';

const IS_MAINNET =
  (process.env.NEXT_PUBLIC_CHAIN_PROFILE ?? 'testnet') === 'mainnet';
const CHAIN_ID: SupportedChainId = IS_MAINNET ? celo.id : celoSepolia.id;
const CONTRACT_ADDRESS = CONTRACTS[CHAIN_ID].auraTip as Address;

export interface AuraTipStats {
  tipsReceivedCount: bigint;
  tipsSentCount: bigint;
}

export function useAuraTipStats(address: Address) {
  const { data, isPending, isError } = useReadContracts({
    contracts: [
      {
        address: CONTRACT_ADDRESS,
        abi: auraTipAbi,
        functionName: 'tipsReceivedCount',
        args: [address],
      },
      {
        address: CONTRACT_ADDRESS,
        abi: auraTipAbi,
        functionName: 'tipsSentCount',
        args: [address],
      },
    ],
  });

  const tipsReceivedCount =
    data?.[0]?.status === 'success' ? (data[0].result as bigint) : 0n;
  const tipsSentCount =
    data?.[1]?.status === 'success' ? (data[1].result as bigint) : 0n;

  return { tipsReceivedCount, tipsSentCount, isPending, isError };
}
