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
import { celo, celoSepolia } from 'viem/chains';
import { fetchTipsOnchain } from '@/lib/getOnchainLogs';

const CHAIN_PROFILE = process.env.NEXT_PUBLIC_CHAIN_PROFILE ?? 'testnet';
const IS_MAINNET = CHAIN_PROFILE === 'mainnet';
const CHAIN_ID: SupportedChainId = IS_MAINNET ? celo.id : celoSepolia.id;
const AURA_TIP_ADDRESS = CONTRACTS[CHAIN_ID].auraTip;

function blockscoutBaseUrl(chainId: SupportedChainId): string {
  return chainId === celo.id
    ? 'https://celo.blockscout.com/api/v2'
    : 'https://celo-sepolia.blockscout.com/api/v2';
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

async function fetchCeloscanTips(
  walletTopic: string,
  type: 'received' | 'sent',
): Promise<TipEvent[]> {
  // Celoscan migrated to Etherscan API V2. Prefer server-side key; fall back to public key if set.
  const apiKey =
    process.env.ETHERSCAN_API_KEY ??
    process.env.CELOSCAN_API_KEY ??
    process.env.NEXT_PUBLIC_CELOSCAN_API_KEY ??
    process.env.NEXT_PUBLIC_CELOSCAN_API_KEY ??
    '';

  const topicIndex = type === 'received' ? 'topic2' : 'topic1';
  const operator =
    type === 'received' ? 'topic0_2_opr=and' : 'topic0_1_opr=and';

  // Etherscan API V2 (multichain) endpoint
  const url = new URL('https://api.etherscan.io/v2/api');
  url.searchParams.set('chainid', '42220');
  url.searchParams.set('module', 'logs');
  url.searchParams.set('action', 'getLogs');
  url.searchParams.set('address', AURA_TIP_ADDRESS);
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
    if (!res.ok) throw new Error(`Celoscan HTTP error: ${res.status}`);

    const json = await readCeloscanJson(res);

    if (json.status !== '1') {
      throw new Error(`Celoscan NOTOK: ${json.message} (${json.result})`);
    }
    if (!Array.isArray(json.result)) {
      throw new Error('Celoscan OK response had non-array result');
    }

    allLogs.push(...json.result);
    if (json.result.length < pageSize) break;
  }

  return decodeCeloscanLogs(allLogs, CHAIN_ID);
}

async function fetchBlockscoutTips(
  walletAddress: string,
  type: 'received' | 'sent',
): Promise<TipEvent[]> {
  const base = blockscoutBaseUrl(CHAIN_ID);

  const wallet = walletAddress.toLowerCase();
  const allDecoded: TipEvent[] = [];

  const firstUrl = new URL(`${base}/addresses/${AURA_TIP_ADDRESS}/logs`);
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
    const decoded = decodeBlockscoutLogs(logs, CHAIN_ID);

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
      const u = new URL(`${base}/addresses/${AURA_TIP_ADDRESS}/logs`);
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
): Promise<TipEvent[]> {
  if (!isAddress(address)) return [];
  if (AURA_TIP_ADDRESS === '0x0000000000000000000000000000000000000000')
    return [];

  // Prefer RPC getLogs unless we know the configured provider will reject wide ranges.
  // Alchemy free tier limits eth_getLogs to a ~10 block range, which makes scanning impractical.
  // In that case, skip RPC and go straight to indexed explorers.
  const hasAlchemyKey = !!process.env.ALCHEMY_API_KEY;
  const shouldSkipRpc = IS_MAINNET && hasAlchemyKey; // Alchemy mainnet endpoint is used when key exists

  if (shouldSkipRpc) {
    try {
      return await fetchBlockscoutTips(address, type);
    } catch (blockscoutErr) {
      console.error('[fetchTips] Blockscout failed:', blockscoutErr);
      try {
        return await fetchCeloscanTips(addressToTopic(address), type);
      } catch (celoscanErr) {
        console.error(
          '[fetchTips] Celoscan fallback also failed:',
          celoscanErr,
        );
        return [];
      }
    }
  }

  // RPC getLogs (primary) → Blockscout (fallback) → Celoscan (fallback, mainnet only) → empty array
  try {
    return await fetchTipsOnchain(
      address as Address,
      type,
      AURA_TIP_ADDRESS as Address,
      CHAIN_ID,
    );
  } catch (primaryErr) {
    console.warn(
      '[fetchTips] onchain RPC failed, trying Blockscout:',
      primaryErr,
    );
    try {
      return await fetchBlockscoutTips(address, type);
    } catch (fallbackErr) {
      console.error(
        '[fetchTips] Blockscout fallback also failed:',
        fallbackErr,
      );
      if (IS_MAINNET) {
        try {
          return await fetchCeloscanTips(addressToTopic(address), type);
        } catch (celoscanErr) {
          console.error(
            '[fetchTips] Celoscan fallback also failed:',
            celoscanErr,
          );
        }
      }
      return [];
    }
  }
}
