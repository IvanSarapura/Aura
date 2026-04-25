import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { ScoutResult, TrustLevel, AuraStats } from '@/hooks/useScout';
import { fetchTips } from '@/lib/fetchTips';
import { SUPPORTED_TOKENS, type SupportedChainId } from '@/config/contracts';

const CELO_MAINNET_ID = 42220;
const CELO_SEPOLIA_ID = 11142220;
const BASE_MAINNET_ID = 8453;
const BASE_SEPOLIA_ID = 84532;

// ── Timeout utility ──────────────────────────────────────────────────────────
// Wraps any promise with a hard deadline. External APIs (Etherscan, Blockscout,
// Anthropic) can hang indefinitely — this prevents the route from blocking past
// the deadline and lets callers fall back to null/defaults.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms),
    ),
  ]);
}

// ── On-chain data fetchers ────────────────────────────────────────────────────

interface WalletStats {
  txCount: number;
  stablecoinVolume: string; // sum of all isStablecoin tokens sent, normalized to USD units
  lastActive: string | null;
  walletAge: string | null;
}

function blockscoutBaseUrl(chainId: number): string {
  if (chainId === CELO_MAINNET_ID) return 'https://celo.blockscout.com/api/v2';
  if (chainId === BASE_MAINNET_ID) return 'https://base.blockscout.com/api/v2';
  if (chainId === BASE_SEPOLIA_ID)
    return 'https://base-sepolia.blockscout.com/api/v2';
  return 'https://celo-sepolia.blockscout.com/api/v2';
}

function getStablecoins(chainId: number) {
  const supported = SUPPORTED_TOKENS[chainId as SupportedChainId] ?? [];
  return supported.filter((t) => t.isStablecoin);
}

async function fetchBlockscoutStats(
  address: string,
  chainId: number,
): Promise<WalletStats> {
  const base = blockscoutBaseUrl(chainId);
  const stablecoins = getStablecoins(chainId);

  // Fetch wallet txs, addr summary, and each stablecoin transfer history in parallel
  const results = await Promise.all([
    fetch(`${base}/addresses/${address}/transactions`, {
      next: { revalidate: 30 },
    }),
    fetch(`${base}/addresses/${address}`, { next: { revalidate: 30 } }),
    ...stablecoins.map((t) =>
      fetch(
        `${base}/addresses/${address}/token-transfers?token=${t.address}&filter=from`,
        { next: { revalidate: 60 } },
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

  // Blockscout v2 uses `transaction_count`; `tx_count` kept as fallback for
  // older deployments. Page-item count is a last resort (understates totals).
  const txCount =
    (addrData.transaction_count as number | undefined) ??
    (addrData.tx_count as number | undefined) ??
    (txData.items?.length as number | undefined) ??
    0;
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

type EtherscanV2Ok<T> = { status: '1'; message: 'OK'; result: T };
type EtherscanV2NotOk = { status: '0'; message: string; result: string };
type EtherscanV2Response<T> = EtherscanV2Ok<T> | EtherscanV2NotOk;

function etherscanV2ApiKey(): string {
  return (
    process.env.ETHERSCAN_API_KEY ??
    process.env.CELOSCAN_API_KEY ??
    process.env.NEXT_PUBLIC_CELOSCAN_API_KEY ??
    ''
  );
}

async function fetchJsonWithRevalidate(
  url: string,
  revalidateSeconds: number,
): Promise<unknown> {
  const res = await fetch(url, { next: { revalidate: revalidateSeconds } });
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  return res.json();
}

async function etherscanV2Get<T>(
  params: Record<string, string>,
  chainId: number = CELO_MAINNET_ID,
): Promise<T> {
  const url = new URL('https://api.etherscan.io/v2/api');
  url.searchParams.set('chainid', String(chainId));
  url.searchParams.set('apikey', etherscanV2ApiKey());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const json = (await fetchJsonWithRevalidate(
    url.toString(),
    30,
  )) as EtherscanV2Response<T>;
  if (json.status !== '1') {
    throw new Error(`Etherscan V2 NOTOK: ${json.message} (${json.result})`);
  }
  return json.result;
}

function parseUnixSecondsToIso(input?: string): string | null {
  if (!input) return null;
  const n = Number(input);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString();
}

async function fetchEtherscanV2Stats(
  address: string,
  chainId: number = CELO_MAINNET_ID,
): Promise<WalletStats> {
  // Efficient walletAge/lastActive: query first tx (asc) and latest tx (desc)
  const [latest, earliest, transfers] = await Promise.all([
    etherscanV2Get<Array<{ timeStamp?: string }>>(
      {
        module: 'account',
        action: 'txlist',
        address,
        sort: 'desc',
        page: '1',
        offset: '1',
      },
      chainId,
    ),
    etherscanV2Get<Array<{ timeStamp?: string }>>(
      {
        module: 'account',
        action: 'txlist',
        address,
        sort: 'asc',
        page: '1',
        offset: '1',
      },
      chainId,
    ),
    // 200 recent transfers are enough for a meaningful volume estimate.
    // 10 000 caused 60-90s Etherscan response times on cold start.
    etherscanV2Get<Array<{ contractAddress?: string; value?: string }>>(
      {
        module: 'account',
        action: 'tokentx',
        address,
        sort: 'desc',
        page: '1',
        offset: '200',
      },
      chainId,
    ).catch(() => []),
  ]);

  const lastActive = parseUnixSecondsToIso(latest?.[0]?.timeStamp);
  const walletAge = parseUnixSecondsToIso(earliest?.[0]?.timeStamp);

  // txCount: Etherscan V2 doesn't provide a cheap "total tx count" for txlist.
  // Use Blockscout's address summary for an accurate count when available.
  let txCount = Math.max(latest.length, earliest.length);
  try {
    const bUrl = blockscoutBaseUrl(chainId);
    const res = await fetch(`${bUrl}/addresses/${address}`, {
      signal: AbortSignal.timeout(3_000),
      next: { revalidate: 30 },
    });
    if (res.ok) {
      const json = (await res.json()) as unknown;
      const j = json as { transaction_count?: unknown; tx_count?: unknown };
      // Blockscout v2 uses `transaction_count`; `tx_count` kept for older deployments.
      const n = Number(j.transaction_count ?? j.tx_count);
      if (Number.isFinite(n) && n >= 0) txCount = n;
    }
  } catch {
    // ignore: keep conservative txCount
  }

  const stablecoins = getStablecoins(chainId);
  const stablecoinAddressSet = new Set(
    stablecoins.map((t) => t.address.toLowerCase()),
  );
  const stablecoinVolume = (transfers ?? [])
    .filter((t) =>
      stablecoinAddressSet.has((t.contractAddress ?? '').toLowerCase()),
    )
    .reduce((acc: number, t) => {
      const addr = (t.contractAddress ?? '').toLowerCase();
      const token = stablecoins.find((s) => s.address.toLowerCase() === addr);
      return acc + Number(t.value ?? '0') / 10 ** (token?.decimals ?? 18);
    }, 0)
    .toFixed(2);

  return { txCount, stablecoinVolume, lastActive, walletAge };
}

async function fetchMainnetStats(
  address: string,
  chainId: number = CELO_MAINNET_ID,
): Promise<WalletStats> {
  try {
    return await fetchEtherscanV2Stats(address, chainId);
  } catch (err) {
    console.warn('[scout] Etherscan V2 failed, trying Blockscout:', err);
    return await fetchBlockscoutStats(address, chainId);
  }
}

// ── Builder detection — wallet has deployed at least one contract ─────────────

async function detectIsBuilder(
  address: string,
  chainId: number,
): Promise<boolean> {
  try {
    if (chainId === CELO_MAINNET_ID) {
      const txs = await etherscanV2Get<Array<{ to?: string | null }>>({
        module: 'account',
        action: 'txlist',
        address,
        sort: 'asc',
        page: '1',
        offset: '50',
      }).catch(() => []);
      return txs.some((tx) => tx.to === '' || tx.to === null);
    } else {
      const base = blockscoutBaseUrl(chainId);
      const res = await fetch(
        `${base}/addresses/${address}/transactions?filter=to%7Cfrom`,
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

async function fetchAuraStats(
  address: string,
  chainId?: SupportedChainId,
): Promise<AuraStats> {
  const [received, sent] = await Promise.all([
    fetchTips(address, 'received', chainId),
    fetchTips(address, 'sent', chainId),
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
    const defaultChainId =
      process.env.NEXT_PUBLIC_CHAIN_PROFILE === 'mainnet'
        ? CELO_MAINNET_ID
        : CELO_SEPOLIA_ID;
    const chainIdParam = searchParams.get('chainId');
    const chainId = chainIdParam ? Number(chainIdParam) : defaultChainId;

    const isMainnetChain =
      chainId === CELO_MAINNET_ID || chainId === BASE_MAINNET_ID;
    const auraChainId = (chainId as SupportedChainId) ?? undefined;

    // Hard timeouts prevent external API hangs from blocking the route
    // indefinitely. Callers fall back to safe defaults on timeout.
    const [stats, isBuilder, auraStats] = await Promise.all([
      withTimeout(
        isMainnetChain
          ? fetchMainnetStats(address, chainId)
          : fetchBlockscoutStats(address, chainId),
        12_000,
      ),
      withTimeout(detectIsBuilder(address, chainId), 5_000).catch(() => false),
      withTimeout(fetchAuraStats(address, auraChainId), 8_000).catch(
        () => null,
      ),
    ]);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const result = apiKey
      ? await withTimeout(
          analyzeWithClaude(address, stats, isBuilder, auraStats),
          10_000,
        ).catch(() => buildFallbackResult(stats, isBuilder, auraStats))
      : buildFallbackResult(stats, isBuilder, auraStats);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[scout]', err);
    return NextResponse.json({ error: 'Scout failed' }, { status: 500 });
  }
}
