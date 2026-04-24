import { isAddress, type Address } from 'viem';
import {
  TIP_SENT_TOPIC0,
  addressToTopic,
  decodeCeloscanLogs,
  decodeBlockscoutLogs,
  type TipEvent,
} from '@/lib/tipEvents';
import type { SupportedChainId } from '@/config/contracts';
import { CONTRACTS } from '@/config/contracts';
import { celo, celoSepolia, base, baseSepolia } from 'viem/chains';
import { fetchTipsOnchain } from '@/lib/getOnchainLogs';
import { env } from '@/config/env';

const IS_MAINNET = process.env.NEXT_PUBLIC_CHAIN_PROFILE === 'mainnet';

// Etherscan V2 unified API covers all EVM chains (Celo, Base, etc.) via ?chainid=.
// One key from etherscan.io is sufficient for all chains.
const ETHERSCAN_API_KEY =
  process.env.ETHERSCAN_API_KEY ??
  process.env.CELOSCAN_API_KEY ??
  env.celoscanApiKey;

function blockscoutBaseUrl(chainId: SupportedChainId): string {
  if (chainId === celo.id) return 'https://celo.blockscout.com/api/v2';
  if (chainId === base.id) return 'https://base.blockscout.com/api/v2';
  if (chainId === baseSepolia.id)
    return 'https://base-sepolia.blockscout.com/api/v2';
  return 'https://celo-sepolia.blockscout.com/api/v2';
}

function defaultChainId(): SupportedChainId {
  return IS_MAINNET ? celo.id : celoSepolia.id;
}

function isMainnetChain(chainId: SupportedChainId): boolean {
  return chainId === celo.id || chainId === base.id;
}

interface RawCeloscanLog {
  transactionHash: string;
  topics: string[];
  data: string;
  timeStamp: string;
}

interface RawBlockscoutLog {
  transaction_hash: string;
  topics: string[];
  data: string;
  block_timestamp: string;
}

type CeloscanLogsResponse =
  | { status: '1'; message: 'OK'; result: RawCeloscanLog[] }
  | { status: '0'; message: string; result: string };

async function readCeloscanJson(res: Response): Promise<CeloscanLogsResponse> {
  const json = (await res.json()) as unknown;
  if (typeof json !== 'object' || json === null) {
    throw new Error('Celoscan returned non-object JSON');
  }
  return json as CeloscanLogsResponse;
}

async function fetchEtherscanTips(
  chainId: SupportedChainId,
  contractAddress: Address,
  walletTopic: string,
  type: 'received' | 'sent',
): Promise<TipEvent[]> {
  const apiKey = ETHERSCAN_API_KEY;
  const topicIndex = type === 'received' ? 'topic2' : 'topic1';
  const operator =
    type === 'received' ? 'topic0_2_opr=and' : 'topic0_1_opr=and';

  const url = new URL('https://api.etherscan.io/v2/api');
  url.searchParams.set('chainid', String(chainId));
  url.searchParams.set('module', 'logs');
  url.searchParams.set('action', 'getLogs');
  url.searchParams.set('address', contractAddress);
  url.searchParams.set('topic0', TIP_SENT_TOPIC0);
  url.searchParams.set(topicIndex, walletTopic);
  url.searchParams.set(operator.split('=')[0], 'and');
  url.searchParams.set('fromBlock', '0');
  url.searchParams.set('toBlock', 'latest');

  const pageSize = 100;
  const allLogs: RawCeloscanLog[] = [];

  for (let page = 1; page <= 50; page++) {
    url.searchParams.set('page', String(page));
    url.searchParams.set('offset', String(pageSize));
    url.searchParams.set('apikey', apiKey);

    const res = await fetch(url.toString(), { next: { revalidate: 30 } });
    if (!res.ok) throw new Error(`Etherscan HTTP error: ${res.status}`);

    const json = await readCeloscanJson(res);

    if (json.status !== '1') {
      throw new Error(`Etherscan NOTOK: ${json.message} (${json.result})`);
    }
    if (!Array.isArray(json.result)) {
      throw new Error('Etherscan OK response had non-array result');
    }

    allLogs.push(...json.result);
    if (json.result.length < pageSize) break;
  }

  return decodeCeloscanLogs(allLogs, chainId);
}

async function fetchBlockscoutTips(
  chainId: SupportedChainId,
  contractAddress: Address,
  walletAddress: string,
  type: 'received' | 'sent',
): Promise<TipEvent[]> {
  const baseUrl = blockscoutBaseUrl(chainId);

  const wallet = walletAddress.toLowerCase();
  const allDecoded: TipEvent[] = [];

  const firstUrl = new URL(`${baseUrl}/addresses/${contractAddress}/logs`);
  firstUrl.searchParams.set('topic', TIP_SENT_TOPIC0);

  let nextUrl: string | null = firstUrl.toString();

  for (let page = 1; page <= 50 && nextUrl; page++) {
    const res = await fetch(nextUrl, { next: { revalidate: 30 } });
    // 404/422 = contract not indexed yet or unknown address — not an error
    if (res.status === 404 || res.status === 422) {
      return allDecoded;
    }
    if (!res.ok) throw new Error(`Blockscout HTTP error: ${res.status}`);

    const json = (await res.json()) as unknown;
    const items = (json as { items?: unknown })?.items;
    const logs = Array.isArray(items) ? (items as RawBlockscoutLog[]) : [];
    const decoded = decodeBlockscoutLogs(logs, chainId);

    const pageFiltered = decoded.filter((t) =>
      type === 'received'
        ? t.to.toLowerCase() === wallet
        : t.from.toLowerCase() === wallet,
    );
    allDecoded.push(...pageFiltered);

    // Blockscout v2 returns next_page_params on some chains; fall back to explicit page-based pagination.
    const nextPageParams = (json as { next_page_params?: unknown })
      ?.next_page_params;
    if (nextPageParams && typeof nextPageParams === 'object') {
      const u = new URL(`${baseUrl}/addresses/${contractAddress}/logs`);
      u.searchParams.set('topic', TIP_SENT_TOPIC0);
      for (const [k, v] of Object.entries(
        nextPageParams as Record<string, unknown>,
      )) {
        if (v == null) continue;
        u.searchParams.set(k, String(v));
      }
      nextUrl = u.toString();
    } else {
      // No cursor provided → stop pagination (some Blockscout deployments don't support page params on logs).
      nextUrl = null;
    }
  }

  return allDecoded;
}

export async function fetchTips(
  address: string,
  type: 'received' | 'sent',
  chainId?: SupportedChainId,
): Promise<TipEvent[]> {
  if (!isAddress(address)) return [];

  const resolvedChainId = chainId ?? defaultChainId();
  const contractAddress = CONTRACTS[resolvedChainId].auraTip;

  if (contractAddress === '0x0000000000000000000000000000000000000000')
    return [];

  // Prefer RPC getLogs unless we know the configured provider will reject wide ranges.
  // Alchemy free tier limits eth_getLogs to a ~10 block range, which makes scanning impractical.
  // In that case, skip RPC and go straight to indexed explorers.
  const hasAlchemyKey = !!process.env.ALCHEMY_API_KEY;
  const shouldSkipRpc = isMainnetChain(resolvedChainId) && hasAlchemyKey;

  if (shouldSkipRpc) {
    try {
      return await fetchBlockscoutTips(
        resolvedChainId,
        contractAddress,
        address,
        type,
      );
    } catch (blockscoutErr) {
      console.error('[fetchTips] Blockscout failed:', blockscoutErr);
      try {
        return await fetchEtherscanTips(
          resolvedChainId,
          contractAddress,
          addressToTopic(address),
          type,
        );
      } catch (etherscanErr) {
        console.error(
          '[fetchTips] Etherscan fallback also failed:',
          etherscanErr,
        );
        return [];
      }
    }
  }

  // RPC getLogs (primary) → Blockscout (fallback) → Etherscan V2 (fallback, mainnet only) → empty array
  try {
    return await fetchTipsOnchain(
      address as Address,
      type,
      contractAddress,
      resolvedChainId,
    );
  } catch (primaryErr) {
    console.warn(
      '[fetchTips] onchain RPC failed, trying Blockscout:',
      primaryErr,
    );
    try {
      return await fetchBlockscoutTips(
        resolvedChainId,
        contractAddress,
        address,
        type,
      );
    } catch (fallbackErr) {
      console.error(
        '[fetchTips] Blockscout fallback also failed:',
        fallbackErr,
      );
      if (isMainnetChain(resolvedChainId)) {
        try {
          return await fetchEtherscanTips(
            resolvedChainId,
            contractAddress,
            addressToTopic(address),
            type,
          );
        } catch (etherscanErr) {
          console.error(
            '[fetchTips] Etherscan fallback also failed:',
            etherscanErr,
          );
        }
      }
      return [];
    }
  }
}
