import { createPublicClient, http, parseAbiItem, type Address } from 'viem';
import { celo, celoSepolia } from 'viem/chains';
import type { SupportedChainId } from '@/config/contracts';
import { SUPPORTED_TOKENS } from '@/config/contracts';
import type { TipEvent } from './tipEvents';

const TIP_SENT_EVENT = parseAbiItem(
  'event TipSent(address indexed from, address indexed to, address indexed token, uint256 amount, string category, string message)',
);

function alchemyUrl(chain: 'testnet' | 'mainnet'): string | undefined {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) return undefined;
  return chain === 'mainnet'
    ? `https://celo-mainnet.g.alchemy.com/v2/${key}`
    : `https://celo-sepolia.g.alchemy.com/v2/${key}`;
}

const TESTNET_CLIENT = createPublicClient({
  chain: celoSepolia,
  transport: http(alchemyUrl('testnet')),
});

const MAINNET_CLIENT = createPublicClient({
  chain: celo,
  transport: http(alchemyUrl('mainnet')),
});

function resolveSymbol(token: string, chainId: SupportedChainId): string {
  const found = SUPPORTED_TOKENS[chainId]?.find(
    (t) => t.address.toLowerCase() === token.toLowerCase(),
  );
  return found?.symbol ?? `${token.slice(0, 6)}…`;
}

function resolveDecimals(token: string, chainId: SupportedChainId): number {
  const found = SUPPORTED_TOKENS[chainId]?.find(
    (t) => t.address.toLowerCase() === token.toLowerCase(),
  );
  return found?.decimals ?? 18;
}

function formatAmount(raw: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const frac = raw % divisor;
  return `${whole}.${frac.toString().padStart(decimals, '0').slice(0, 2)}`;
}

export async function fetchTipsOnchain(
  address: Address,
  type: 'received' | 'sent',
  contractAddress: Address,
  chainId: SupportedChainId,
): Promise<TipEvent[]> {
  const client = chainId === celo.id ? MAINNET_CLIENT : TESTNET_CLIENT;

  // Use contract deployment block if configured — avoids RPC block-range limits.
  // Fallback: scan last 500k blocks (~28 days on Celo Sepolia at 5s/block).
  const deployBlockEnv =
    chainId === celo.id
      ? process.env.NEXT_PUBLIC_AURA_TIP_DEPLOY_BLOCK_MAINNET
      : process.env.NEXT_PUBLIC_AURA_TIP_DEPLOY_BLOCK_TESTNET;

  const fromBlock = deployBlockEnv
    ? BigInt(deployBlockEnv)
    : await client
        .getBlockNumber()
        .then((n) => (n > 500_000n ? n - 500_000n : 0n));

  const logs = await client.getLogs({
    address: contractAddress,
    event: TIP_SENT_EVENT,
    args: type === 'received' ? { to: address } : { from: address },
    fromBlock,
    toBlock: 'latest',
  });

  if (logs.length === 0) return [];

  // Deduplicate block numbers to minimise RPC calls
  const uniqueBlocks = [
    ...new Set(
      logs.map((l) => l.blockNumber).filter((bn): bn is bigint => bn != null),
    ),
  ];
  const blockData = await Promise.all(
    uniqueBlocks.map((bn) => client.getBlock({ blockNumber: bn })),
  );
  const blockTimestamps = new Map<bigint, string>(
    blockData.map((b) => [
      b.number,
      new Date(Number(b.timestamp) * 1000).toISOString(),
    ]),
  );

  return logs
    .filter((l) => l.args != null && l.transactionHash != null)
    .map((l) => {
      const { from, to, token, amount, category, message } = l.args as {
        from: Address;
        to: Address;
        token: Address;
        amount: bigint;
        category: string;
        message: string;
      };
      const decimals = resolveDecimals(token, chainId);
      return {
        from,
        to,
        token,
        tokenSymbol: resolveSymbol(token, chainId),
        amount: formatAmount(amount, decimals),
        category,
        message,
        timestamp:
          blockTimestamps.get(l.blockNumber!) ?? new Date().toISOString(),
        txHash: l.transactionHash as string,
      };
    });
}
