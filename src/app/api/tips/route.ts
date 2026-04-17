import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
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

const CHAIN_PROFILE = process.env.NEXT_PUBLIC_CHAIN_PROFILE ?? 'testnet';
const IS_MAINNET = CHAIN_PROFILE === 'mainnet';

const CHAIN_ID: SupportedChainId = IS_MAINNET ? celo.id : celoSepolia.id;
const AURA_TIP_ADDRESS = CONTRACTS[CHAIN_ID].auraTip;

// ── Mainnet: CeloScan (Etherscan V2) ────────────────────────────────────────

async function fetchCeloscanTips(
  walletTopic: string,
  type: 'received' | 'sent',
): Promise<TipEvent[]> {
  const apiKey =
    process.env.CELOSCAN_API_KEY ??
    process.env.NEXT_PUBLIC_CELOSCAN_API_KEY ??
    '';

  // topic1 = from (sent), topic2 = to (received)
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

  const res = await fetch(url.toString(), { next: { revalidate: 120 } });
  if (!res.ok) return [];

  const json = await res.json();
  const logs = Array.isArray(json.result) ? json.result : [];
  return decodeCeloscanLogs(logs, CHAIN_ID);
}

// ── Testnet: Blockscout ──────────────────────────────────────────────────────

async function fetchBlockscoutTips(
  walletAddress: string,
  type: 'received' | 'sent',
): Promise<TipEvent[]> {
  const base = 'https://celo-sepolia.blockscout.com/api/v2';

  // Blockscout v2 filters event logs by address, then we filter client-side
  const url = `${base}/addresses/${AURA_TIP_ADDRESS}/logs?topic=${TIP_SENT_TOPIC0}&page_size=50`;

  const res = await fetch(url, { next: { revalidate: 120 } });
  if (!res.ok) return [];

  const json = await res.json();
  const logs = Array.isArray(json.items) ? json.items : [];
  const decoded = decodeBlockscoutLogs(logs, CHAIN_ID);

  // Filter client-side by direction
  const wallet = walletAddress.toLowerCase();
  return decoded.filter((t) =>
    type === 'received'
      ? t.to.toLowerCase() === wallet
      : t.from.toLowerCase() === wallet,
  );
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address') ?? '';
  const type = (searchParams.get('type') ?? 'received') as 'received' | 'sent';

  if (!isAddress(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  if (AURA_TIP_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return NextResponse.json({ tips: [] });
  }

  try {
    let tips: TipEvent[];

    if (IS_MAINNET) {
      const walletTopic = addressToTopic(address);
      tips = await fetchCeloscanTips(walletTopic, type);
    } else {
      tips = await fetchBlockscoutTips(address, type);
    }

    // Newest first
    tips.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return NextResponse.json({ tips });
  } catch {
    return NextResponse.json({ tips: [] });
  }
}
