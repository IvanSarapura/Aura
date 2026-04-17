import { decodeAbiParameters, getAddress } from 'viem';
import type { Address } from 'viem';
import type { SupportedChainId } from '@/config/contracts';
import { SUPPORTED_TOKENS } from '@/config/contracts';

// keccak256("TipSent(address,address,address,uint256,string,string)")
export const TIP_SENT_TOPIC0 =
  '0xc1ab8d3aee3e7eba64461dc736acad438831821caac8dcd7b4cbfdbbbd4c8be2' as const;

export interface TipEvent {
  from: Address;
  to: Address;
  token: Address;
  tokenSymbol: string;
  amount: string; // human-readable, e.g. "5.00"
  category: string;
  message: string;
  timestamp: string; // ISO date string
  txHash: string;
}

// Pad a wallet address into a 32-byte topic (lowercase, no checksum needed)
export function addressToTopic(address: string): string {
  return `0x000000000000000000000000${address.replace(/^0x/i, '').toLowerCase()}`;
}

function tokenSymbol(tokenAddress: string, chainId: SupportedChainId): string {
  const tokens = SUPPORTED_TOKENS[chainId] ?? [];
  const found = tokens.find(
    (t) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
  );
  return found?.symbol ?? tokenAddress.slice(0, 6) + '…';
}

function tokenDecimals(
  tokenAddress: string,
  chainId: SupportedChainId,
): number {
  const tokens = SUPPORTED_TOKENS[chainId] ?? [];
  const found = tokens.find(
    (t) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
  );
  return found?.decimals ?? 18;
}

function formatAmount(raw: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const frac = raw % divisor;
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, 2);
  return `${whole}.${fracStr}`;
}

// ── Raw log shape returned by CeloScan and Blockscout ───────────────────────

interface RawCeloscanLog {
  transactionHash: string;
  topics: string[];
  data: string;
  timeStamp: string; // unix seconds as hex string "0x..."
}

interface RawBlockscoutLog {
  transaction_hash: string;
  topics: string[];
  data: string;
  block_timestamp: string; // ISO date string
}

function stripAddressPadding(topic: string): Address {
  return getAddress(`0x${topic.slice(-40)}`);
}

export function decodeCeloscanLogs(
  logs: RawCeloscanLog[],
  chainId: SupportedChainId,
): TipEvent[] {
  return logs
    .filter((l) => l.topics[0]?.toLowerCase() === TIP_SENT_TOPIC0)
    .map((l) => {
      const from = stripAddressPadding(l.topics[1]);
      const to = stripAddressPadding(l.topics[2]);
      const token = stripAddressPadding(l.topics[3]);

      const [amount, category, message] = decodeAbiParameters(
        [{ type: 'uint256' }, { type: 'string' }, { type: 'string' }],
        l.data as `0x${string}`,
      ) as [bigint, string, string];

      const decimals = tokenDecimals(token, chainId);
      const ts = parseInt(l.timeStamp, 16);
      const timestamp = new Date(ts * 1000).toISOString();

      return {
        from,
        to,
        token,
        tokenSymbol: tokenSymbol(token, chainId),
        amount: formatAmount(amount, decimals),
        category,
        message,
        timestamp,
        txHash: l.transactionHash,
      };
    });
}

export function decodeBlockscoutLogs(
  logs: RawBlockscoutLog[],
  chainId: SupportedChainId,
): TipEvent[] {
  return logs
    .filter((l) => l.topics[0]?.toLowerCase() === TIP_SENT_TOPIC0)
    .map((l) => {
      const from = stripAddressPadding(l.topics[1]);
      const to = stripAddressPadding(l.topics[2]);
      const token = stripAddressPadding(l.topics[3]);

      const [amount, category, message] = decodeAbiParameters(
        [{ type: 'uint256' }, { type: 'string' }, { type: 'string' }],
        l.data as `0x${string}`,
      ) as [bigint, string, string];

      const decimals = tokenDecimals(token, chainId);

      return {
        from,
        to,
        token,
        tokenSymbol: tokenSymbol(token, chainId),
        amount: formatAmount(amount, decimals),
        category,
        message,
        timestamp: l.block_timestamp,
        txHash: l.transaction_hash,
      };
    });
}
