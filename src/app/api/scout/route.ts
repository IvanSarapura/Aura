import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { ScoutResult, TrustLevel } from '@/hooks/useScout';

const CELO_MAINNET_ID = 42220;
const CELO_SEPOLIA_ID = 11142220;

// ── On-chain data fetchers ────────────────────────────────────────────────────

interface BlockscoutStats {
  txCount: number;
  usdmVolume: string; // formatted USDm transferred
  lastActive: string; // ISO date string
  walletAge: string; // ISO date string of first tx
}

async function fetchBlockscoutStats(address: string): Promise<BlockscoutStats> {
  const base = 'https://celo-sepolia.blockscout.com/api/v2';

  const [txsRes, transfersRes] = await Promise.all([
    fetch(`${base}/addresses/${address}/transactions?limit=50`),
    fetch(`${base}/addresses/${address}/token-transfers?token=USDm&limit=50`),
  ]);

  const txData = txsRes.ok ? await txsRes.json() : { items: [] };
  const transferData = transfersRes.ok
    ? await transfersRes.json()
    : { items: [] };

  const txCount = txData.items?.length ?? 0;
  const lastActive = txData.items?.[0]?.timestamp ?? new Date().toISOString();
  const walletAge =
    txData.items?.[txCount - 1]?.timestamp ?? new Date().toISOString();

  const totalUsdm = (transferData.items ?? []).reduce(
    (acc: bigint, t: { total?: { value?: string } }) =>
      acc + BigInt(t.total?.value ?? '0'),
    0n,
  );
  const usdmVolume = (Number(totalUsdm) / 1e18).toFixed(2);

  return { txCount, usdmVolume, lastActive, walletAge };
}

async function fetchCeloscanStats(address: string): Promise<BlockscoutStats> {
  const apiKey =
    process.env.CELOSCAN_API_KEY ??
    process.env.NEXT_PUBLIC_CELOSCAN_API_KEY ??
    '';
  const base = 'https://api.celoscan.io/api';

  const [txsRes, transfersRes] = await Promise.all([
    fetch(
      `${base}?module=account&action=txlist&address=${address}&sort=desc&apikey=${apiKey}`,
    ),
    fetch(
      `${base}?module=account&action=tokentx&address=${address}&sort=desc&apikey=${apiKey}`,
    ),
  ]);

  const txData = txsRes.ok ? await txsRes.json() : { result: [] };
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
    : new Date().toISOString();
  const walletAge = txs[txs.length - 1]?.timeStamp
    ? new Date(Number(txs[txs.length - 1].timeStamp) * 1000).toISOString()
    : new Date().toISOString();

  const usdmTransfers = transfers.filter(
    (t: { tokenSymbol?: string }) => t.tokenSymbol === 'cUSD',
  );
  const totalUsdm = usdmTransfers.reduce(
    (acc: bigint, t: { value?: string }) => acc + BigInt(t.value ?? '0'),
    0n,
  );
  const usdmVolume = (Number(totalUsdm) / 1e18).toFixed(2);

  return { txCount, usdmVolume, lastActive, walletAge };
}

// ── Trust level heuristic (fallback when no AI key) ──────────────────────────

function deriveTrustLevel(stats: BlockscoutStats): TrustLevel {
  const ageMs = Date.now() - new Date(stats.walletAge).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const volume = parseFloat(stats.usdmVolume);

  if (stats.txCount >= 50 && ageDays >= 180 && volume >= 100) return 'High';
  if (stats.txCount >= 10 && ageDays >= 30) return 'Medium';
  return 'Low';
}

function buildFallbackResult(
  address: string,
  stats: BlockscoutStats,
): ScoutResult {
  const trustLevel = deriveTrustLevel(stats);
  const headlines: Record<TrustLevel, string> = {
    High: 'Active contributor with strong on-chain history',
    Medium: 'Growing wallet with moderate activity',
    Low: 'New or low-activity wallet',
  };
  return {
    trustLevel,
    headline: headlines[trustLevel],
    tags: [
      trustLevel === 'High'
        ? 'Veteran'
        : trustLevel === 'Medium'
          ? 'Active'
          : 'Newcomer',
      parseFloat(stats.usdmVolume) > 0 ? 'USDm User' : 'No transfers',
    ],
    stats,
  };
}

// ── AI-powered analysis ───────────────────────────────────────────────────────

async function analyzeWithClaude(
  address: string,
  stats: BlockscoutStats,
): Promise<ScoutResult> {
  const client = new Anthropic();

  const prompt = `You are Aura Scout, a Web3 reputation analyst for the Celo blockchain.

Analyze this wallet and return a JSON object with EXACTLY this shape:
{
  "trustLevel": "Low" | "Medium" | "High",
  "headline": "<one sentence, max 80 chars>",
  "tags": ["<tag1>", "<tag2>", "<tag3>"],
  "stats": <echo back the stats object unchanged>
}

Wallet: ${address}
Stats:
- Transactions: ${stats.txCount}
- USDm volume: $${stats.usdmVolume}
- Last active: ${stats.lastActive}
- Wallet age: ${stats.walletAge}

Rules:
- trustLevel High: txCount ≥ 50, wallet age ≥ 180 days, volume ≥ $100
- trustLevel Medium: txCount ≥ 10, wallet age ≥ 30 days
- trustLevel Low: everything else
- tags should reflect activity patterns (e.g. "Veteran", "DeFi User", "Early Adopter", "Regular Tipper")
- headline must be encouraging and factual

Return ONLY valid JSON. No markdown, no explanation.`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (
    message.content[0] as { type: string; text: string }
  ).text.trim();
  const parsed = JSON.parse(raw) as ScoutResult;
  // Always echo back the server-fetched stats to prevent hallucination
  return { ...parsed, stats };
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

    const stats = await (chainId === CELO_MAINNET_ID
      ? fetchCeloscanStats(address)
      : fetchBlockscoutStats(address));

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const result = apiKey
      ? await analyzeWithClaude(address, stats)
      : buildFallbackResult(address, stats);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[scout]', err);
    return NextResponse.json({ error: 'Scout failed' }, { status: 500 });
  }
}
