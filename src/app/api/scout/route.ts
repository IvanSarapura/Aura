import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { ScoutResult, TrustLevel, AuraStats } from '@/hooks/useScout';
import { fetchTips } from '@/lib/fetchTips';
import { SUPPORTED_TOKENS, type SupportedChainId } from '@/config/contracts';

const CELO_MAINNET_ID = 42220;
const CELO_SEPOLIA_ID = 11142220;

// ── On-chain data fetchers ────────────────────────────────────────────────────

interface WalletStats {
  txCount: number;
  stablecoinVolume: string; // sum of all isStablecoin tokens sent, normalized to USD units
  lastActive: string | null;
  walletAge: string | null;
}

async function fetchBlockscoutStats(address: string): Promise<WalletStats> {
  const base = 'https://celo-sepolia.blockscout.com/api/v2';
  const stablecoins = SUPPORTED_TOKENS[
    CELO_SEPOLIA_ID as SupportedChainId
  ].filter((t) => t.isStablecoin);

  // Fetch wallet txs, addr summary, and each stablecoin transfer history in parallel
  const results = await Promise.all([
    fetch(`${base}/addresses/${address}/transactions`),
    fetch(`${base}/addresses/${address}`),
    ...stablecoins.map((t) =>
      fetch(
        `${base}/addresses/${address}/token-transfers?token=${t.address}&filter=from`,
      ),
    ),
  ]);

  const txsRes = results[0];
  const addrRes = results[1];
  const transferResponses = results.slice(2);

  // 422 = address unknown to Blockscout (new wallet, no activity)
  if (txsRes.status === 422 || addrRes.status === 422) {
    return {
      txCount: 0,
      stablecoinVolume: '0.00',
      lastActive: null,
      walletAge: null,
    };
  }
  if (!txsRes.ok) throw new Error(`Blockscout txs error: ${txsRes.status}`);
  if (!addrRes.ok) throw new Error(`Blockscout addr error: ${addrRes.status}`);

  const [txData, addrData] = await Promise.all([txsRes.json(), addrRes.json()]);

  const txCount = addrData.tx_count ?? txData.items?.length ?? 0;
  const items: { timestamp?: string }[] = txData.items ?? [];
  const lastActive = items[0]?.timestamp ?? null;
  const walletAge = items[items.length - 1]?.timestamp ?? null;

  // Sum transfer volumes across all stablecoins, normalizing each by its own decimals
  let total = 0;
  for (const [i, res] of transferResponses.entries()) {
    if (!res.ok) continue;
    const data = await res.json();
    const decimals = stablecoins[i]?.decimals ?? 18;
    total += (data.items ?? []).reduce(
      (acc: number, t: { total?: { value?: string } }) =>
        acc + Number(t.total?.value ?? '0') / 10 ** decimals,
      0,
    );
  }

  return { txCount, stablecoinVolume: total.toFixed(2), lastActive, walletAge };
}

async function fetchCeloscanStats(address: string): Promise<WalletStats> {
  const apiKey =
    process.env.CELOSCAN_API_KEY ??
    process.env.NEXT_PUBLIC_CELOSCAN_API_KEY ??
    '';
  const base = 'https://api.celoscan.io/api';

  const [txsRes, transfersRes] = await Promise.all([
    fetch(
      `${base}?module=account&action=txlist&address=${address}&sort=desc&offset=10000&page=1&apikey=${apiKey}`,
    ),
    fetch(
      `${base}?module=account&action=tokentx&address=${address}&sort=desc&offset=10000&page=1&apikey=${apiKey}`,
    ),
  ]);

  if (!txsRes.ok) throw new Error(`Celoscan txs error: ${txsRes.status}`);

  const txData = await txsRes.json();
  const transferData = transfersRes.ok
    ? await transfersRes.json()
    : { result: [] };

  const txs = Array.isArray(txData.result) ? txData.result : [];
  const transfers = Array.isArray(transferData.result)
    ? transferData.result
    : [];

  const txCount = txs.length;
  const lastActive = txs[0]?.timeStamp
    ? new Date(Number(txs[0].timeStamp) * 1000).toISOString()
    : null;
  const walletAge = txs[txs.length - 1]?.timeStamp
    ? new Date(Number(txs[txs.length - 1].timeStamp) * 1000).toISOString()
    : null;

  // Filter token transfers by known stablecoin contract addresses and sum with correct decimals
  const stablecoins = SUPPORTED_TOKENS[
    CELO_MAINNET_ID as SupportedChainId
  ].filter((t) => t.isStablecoin);
  const stablecoinAddressSet = new Set(
    stablecoins.map((t) => t.address.toLowerCase()),
  );
  const stablecoinVolume = transfers
    .filter((t: { contractAddress?: string }) =>
      stablecoinAddressSet.has((t.contractAddress ?? '').toLowerCase()),
    )
    .reduce((acc: number, t: { value?: string; contractAddress?: string }) => {
      const addr = (t.contractAddress ?? '').toLowerCase();
      const token = stablecoins.find((s) => s.address.toLowerCase() === addr);
      return acc + Number(t.value ?? '0') / 10 ** (token?.decimals ?? 18);
    }, 0)
    .toFixed(2);

  return { txCount, stablecoinVolume, lastActive, walletAge };
}

// ── Builder detection — wallet has deployed at least one contract ─────────────

async function detectIsBuilder(
  address: string,
  chainId: number,
): Promise<boolean> {
  try {
    if (chainId === CELO_MAINNET_ID) {
      const apiKey =
        process.env.CELOSCAN_API_KEY ??
        process.env.NEXT_PUBLIC_CELOSCAN_API_KEY ??
        '';
      const url = `https://api.celoscan.io/api?chainid=42220&module=account&action=txlist&address=${address}&sort=asc&page=1&offset=20&apikey=${apiKey}`;
      const res = await fetch(url);
      const json = res.ok ? await res.json() : { result: [] };
      const txs = Array.isArray(json.result) ? json.result : [];
      return txs.some((tx: { to?: string }) => tx.to === '' || tx.to === null);
    } else {
      const base = 'https://celo-sepolia.blockscout.com/api/v2';
      const res = await fetch(
        `${base}/addresses/${address}/transactions?filter=to%7Cfrom&page_size=20`,
      );
      const json = res.ok ? await res.json() : { items: [] };
      const txs = Array.isArray(json.items) ? json.items : [];
      return txs.some((tx: { to?: unknown }) => tx.to === null || tx.to === '');
    }
  } catch {
    return false;
  }
}

// ── Aura-native activity stats ────────────────────────────────────────────────

async function fetchAuraStats(address: string): Promise<AuraStats> {
  const [received, sent] = await Promise.all([
    fetchTips(address, 'received'),
    fetchTips(address, 'sent'),
  ]);

  const uniqueTippers = new Set(received.map((t) => t.from.toLowerCase())).size;

  const categoryCounts = received.reduce<Record<string, number>>((acc, t) => {
    if (t.category) acc[t.category] = (acc[t.category] ?? 0) + 1;
    return acc;
  }, {});
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  const totalVolumeReceived = received
    .reduce((acc, t) => acc + parseFloat(t.amount), 0)
    .toFixed(2);

  return {
    tipsReceived: received.length,
    tipsSent: sent.length,
    uniqueTippers,
    topCategories,
    totalVolumeReceived,
  };
}

// ── Trust level heuristic (fallback when no AI key) ──────────────────────────

function deriveTrustLevel(
  stats: WalletStats,
  auraStats: AuraStats | null,
): TrustLevel {
  const ageMs = stats.walletAge
    ? Date.now() - new Date(stats.walletAge).getTime()
    : 0;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const volume = parseFloat(stats.stablecoinVolume);

  const tipsReceived = auraStats?.tipsReceived ?? 0;
  const tipsSent = auraStats?.tipsSent ?? 0;
  const uniqueTippers = auraStats?.uniqueTippers ?? 0;

  if (stats.txCount >= 50 && ageDays >= 180 && volume >= 100) return 'High';
  if (auraStats && tipsReceived >= 10 && uniqueTippers >= 3) return 'High';
  if (auraStats && tipsSent >= 20) return 'High';
  if (auraStats && tipsSent >= 12 && tipsReceived >= 3) return 'High';

  if (stats.txCount >= 10 && ageDays >= 30) return 'Medium';
  if (auraStats && tipsReceived >= 3) return 'Medium';
  if (auraStats && tipsSent >= 5) return 'Medium';

  return 'Low';
}

function buildFallbackResult(
  stats: WalletStats,
  isBuilder: boolean,
  auraStats: AuraStats | null,
): ScoutResult {
  const trustLevel = deriveTrustLevel(stats, auraStats);

  const auraActive = auraStats && auraStats.tipsReceived > 0;
  const headlines: Record<TrustLevel, string> = {
    High: auraActive
      ? 'Trusted community member with proven tipping history'
      : 'Active contributor with strong on-chain history',
    Medium: auraActive
      ? 'Growing Aura contributor with active tipping'
      : 'Growing wallet with moderate activity',
    Low: 'New or low-activity wallet — start tipping to build reputation',
  };

  return {
    trustLevel,
    headline: headlines[trustLevel],
    isBuilder,
    stats,
    auraStats,
  };
}

// ── AI-powered analysis ───────────────────────────────────────────────────────

async function analyzeWithClaude(
  address: string,
  stats: WalletStats,
  isBuilder: boolean,
  auraStats: AuraStats | null,
): Promise<ScoutResult> {
  const client = new Anthropic();

  const auraSection = auraStats
    ? `Aura platform activity:
- Tips received: ${auraStats.tipsReceived}
- Tips sent: ${auraStats.tipsSent} (outgoing tips signal generosity and ecosystem participation; weigh alongside tips received)
- Unique tippers: ${auraStats.uniqueTippers}
- Total volume received: $${auraStats.totalVolumeReceived}
- Top categories: ${auraStats.topCategories.join(', ') || 'none'}`
    : 'Aura platform activity: unavailable';

  const prompt = `You are Aura Scout, a Web3 reputation analyst for the Celo blockchain.

Analyze this wallet and return a JSON object with EXACTLY this shape:
{
  "trustLevel": "Low" | "Medium" | "High",
  "headline": "<one sentence, max 80 chars>"
}

Wallet: ${address}
On-chain stats:
- Transactions: ${stats.txCount}
- Stablecoin volume sent: $${stats.stablecoinVolume}
- Last active: ${stats.lastActive ?? 'unknown'}
- Wallet age: ${stats.walletAge ?? 'unknown'}
- Is smart contract deployer: ${isBuilder}
${auraSection}

Rules:
- trustLevel High: txCount ≥ 50, wallet age ≥ 180 days, volume ≥ $100 OR tipsReceived ≥ 10 with ≥3 unique tippers OR tipsSent ≥ 20 OR (tipsSent ≥ 12 AND tipsReceived ≥ 3)
- trustLevel Medium: txCount ≥ 10, wallet age ≥ 30 days OR tipsReceived ≥ 3 OR tipsSent ≥ 5
- trustLevel Low: everything else
- headline must be encouraging and factual, max 80 chars

Return ONLY valid JSON. No markdown, no explanation.`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (
    message.content[0] as { type: string; text: string }
  ).text.trim();
  const parsed = JSON.parse(raw) as Omit<
    ScoutResult,
    'stats' | 'isBuilder' | 'auraStats'
  >;
  return { ...parsed, stats, isBuilder, auraStats };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  try {
    const chainId = Number(
      process.env.NEXT_PUBLIC_CHAIN_PROFILE === 'mainnet'
        ? CELO_MAINNET_ID
        : CELO_SEPOLIA_ID,
    );

    const [stats, isBuilder, auraStats] = await Promise.all([
      chainId === CELO_MAINNET_ID
        ? fetchCeloscanStats(address)
        : fetchBlockscoutStats(address),
      detectIsBuilder(address, chainId),
      fetchAuraStats(address).catch(() => null),
    ]);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const result = apiKey
      ? await analyzeWithClaude(address, stats, isBuilder, auraStats)
      : buildFallbackResult(stats, isBuilder, auraStats);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[scout]', err);
    return NextResponse.json({ error: 'Scout failed' }, { status: 500 });
  }
}
