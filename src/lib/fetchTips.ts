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

async function fetchCeloscanTips(
  walletTopic: string,
  type: 'received' | 'sent',
): Promise<TipEvent[]> {
  const apiKey =
    process.env.CELOSCAN_API_KEY ??
    process.env.NEXT_PUBLIC_CELOSCAN_API_KEY ??
    '';

  const topicIndex = type === 'received' ? 'topic2' : 'topic1';
  const operator =
    type === 'received' ? 'topic0_2_opr=and' : 'topic0_1_opr=and';

  const url = new URL('https://api.celoscan.io/api');
  url.searchParams.set('chainid', '42220');
  url.searchParams.set('module', 'logs');
  url.searchParams.set('action', 'getLogs');
  url.searchParams.set('address', AURA_TIP_ADDRESS);
  url.searchParams.set('topic0', TIP_SENT_TOPIC0);
  url.searchParams.set(topicIndex, walletTopic);
  url.searchParams.set(operator.split('=')[0], 'and');
  url.searchParams.set('fromBlock', '0');
  url.searchParams.set('toBlock', 'latest');
  url.searchParams.set('page', '1');
  url.searchParams.set('offset', '50');
  url.searchParams.set('apikey', apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`Celoscan error: ${res.status}`);

  const json = await res.json();
  const logs = Array.isArray(json.result) ? json.result : [];
  return decodeCeloscanLogs(logs, CHAIN_ID);
}

async function fetchBlockscoutTips(
  walletAddress: string,
  type: 'received' | 'sent',
): Promise<TipEvent[]> {
  const base = 'https://celo-sepolia.blockscout.com/api/v2';
  const url = `${base}/addresses/${AURA_TIP_ADDRESS}/logs?topic=${TIP_SENT_TOPIC0}&page_size=50`;

  const res = await fetch(url, { next: { revalidate: 30 } });
  // 404/422 = contract not indexed yet or unknown address — not an error
  if (res.status === 404 || res.status === 422) return [];
  if (!res.ok) throw new Error(`Blockscout error: ${res.status}`);

  const json = await res.json();
  const logs = Array.isArray(json.items) ? json.items : [];
  const decoded = decodeBlockscoutLogs(logs, CHAIN_ID);

  const wallet = walletAddress.toLowerCase();
  return decoded.filter((t) =>
    type === 'received'
      ? t.to.toLowerCase() === wallet
      : t.from.toLowerCase() === wallet,
  );
}

export async function fetchTips(
  address: string,
  type: 'received' | 'sent',
): Promise<TipEvent[]> {
  if (!isAddress(address)) return [];
  if (AURA_TIP_ADDRESS === '0x0000000000000000000000000000000000000000')
    return [];

  if (IS_MAINNET) {
    return fetchCeloscanTips(addressToTopic(address), type);
  }

  // Testnet: viem getLogs (primary) → Blockscout (fallback) → empty array
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
      return [];
    }
  }
}
