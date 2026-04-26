import { NextResponse } from 'next/server';
import type { ScoutFastResult } from '@/hooks/useScout';

const CELO_MAINNET_ID = 42220;
const BASE_MAINNET_ID = 8453;

function blockscoutBaseUrl(chainId: number): string {
  if (chainId === CELO_MAINNET_ID) return 'https://celo.blockscout.com/api/v2';
  if (chainId === BASE_MAINNET_ID) return 'https://base.blockscout.com/api/v2';
  if (chainId === 84532) return 'https://base-sepolia.blockscout.com/api/v2';
  return 'https://celo-sepolia.blockscout.com/api/v2';
}

function etherscanV2ApiKey(): string {
  return (
    process.env.ETHERSCAN_API_KEY ??
    process.env.CELOSCAN_API_KEY ??
    process.env.NEXT_PUBLIC_CELOSCAN_API_KEY ??
    ''
  );
}

function parseUnixSecondsToIso(input?: string): string | null {
  if (!input) return null;
  const n = Number(input);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString();
}

// txCount sentinel: null = API couldn't confirm a count, keep skeleton in UI.
// Only return 0 when we have an explicit "no activity" signal (HTTP 422).
function parseBlockscoutTxCount(json: {
  transaction_count?: unknown;
  tx_count?: unknown;
}): number | null {
  const n = Number(json.transaction_count ?? json.tx_count);
  // Return the count only when it's a positive integer. 0 from this endpoint
  // can mean "not yet indexed" rather than "genuinely empty wallet", so we treat
  // it as null and let the full scout result confirm it.
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function fetchFastStatsMainnet(
  address: string,
  chainId: number,
): Promise<ScoutFastResult> {
  const apiKey = etherscanV2ApiKey();
  const base = blockscoutBaseUrl(chainId);

  const buildEtherscanUrl = (params: Record<string, string>) => {
    const url = new URL('https://api.etherscan.io/v2/api');
    url.searchParams.set('chainid', String(chainId));
    url.searchParams.set('apikey', apiKey);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return url.toString();
  };

  const signal = AbortSignal.timeout(3_500);

  const [latestRes, earliestRes, addrRes] = await Promise.allSettled([
    fetch(
      buildEtherscanUrl({
        module: 'account',
        action: 'txlist',
        address,
        sort: 'desc',
        page: '1',
        offset: '5',
      }),
      { signal, next: { revalidate: 30 } },
    ),
    fetch(
      buildEtherscanUrl({
        module: 'account',
        action: 'txlist',
        address,
        sort: 'asc',
        page: '1',
        offset: '1',
      }),
      { signal, next: { revalidate: 30 } },
    ),
    fetch(`${base}/addresses/${address}`, {
      signal,
      next: { revalidate: 30 },
    }),
  ]);

  let txCount: number | null = null;
  let walletAge: string | null = null;
  let lastActive: string | null = null;
  let isBuilder = false;

  if (addrRes.status === 'fulfilled' && addrRes.value.ok) {
    const json = (await addrRes.value.json()) as {
      transaction_count?: unknown;
      tx_count?: unknown;
    };
    txCount = parseBlockscoutTxCount(json);
  }

  if (latestRes.status === 'fulfilled' && latestRes.value.ok) {
    type EthTx = { timeStamp?: string; to?: string | null };
    const json = (await latestRes.value.json()) as {
      status: string;
      result: EthTx[];
    };
    if (json.status === '1' && Array.isArray(json.result)) {
      lastActive = parseUnixSecondsToIso(json.result[0]?.timeStamp);
      isBuilder = json.result.some((tx) => tx.to === '' || tx.to === null);
    }
  }

  if (earliestRes.status === 'fulfilled' && earliestRes.value.ok) {
    type EthTx = { timeStamp?: string };
    const json = (await earliestRes.value.json()) as {
      status: string;
      result: EthTx[];
    };
    if (json.status === '1' && Array.isArray(json.result)) {
      walletAge = parseUnixSecondsToIso(json.result[0]?.timeStamp);
    }
  }

  // Fallback: when Etherscan doesn't return timestamps (missing API key, rate limit,
  // or no activity), query Blockscout for at least a best-effort date estimate.
  if (!lastActive || !walletAge) {
    try {
      const fbUrl = `${blockscoutBaseUrl(chainId)}/addresses/${address}/transactions`;
      const fbRes = await fetch(fbUrl, {
        signal: AbortSignal.timeout(2_000),
        next: { revalidate: 30 },
      });
      if (fbRes.ok) {
        const fbData = (await fbRes.json()) as {
          items?: Array<{ timestamp?: string }>;
        };
        const fbItems = fbData.items ?? [];
        if (!lastActive) lastActive = fbItems[0]?.timestamp ?? null;
        if (!walletAge)
          walletAge = fbItems[fbItems.length - 1]?.timestamp ?? null;
      }
    } catch {
      // ignore — keep existing null values
    }
  }

  return { txCount, walletAge, lastActive, isBuilder };
}

async function fetchFastStatsBlockscout(
  address: string,
  chainId: number,
): Promise<ScoutFastResult> {
  const base = blockscoutBaseUrl(chainId);
  const signal = AbortSignal.timeout(3_500);

  const [addrRes, txsRes] = await Promise.allSettled([
    fetch(`${base}/addresses/${address}`, {
      signal,
      next: { revalidate: 30 },
    }),
    fetch(`${base}/addresses/${address}/transactions`, {
      signal,
      next: { revalidate: 30 },
    }),
  ]);

  let txCount: number | null = null;
  let walletAge: string | null = null;
  let lastActive: string | null = null;
  let isBuilder = false;

  if (addrRes.status === 'fulfilled') {
    const res = addrRes.value;
    // 422 = Blockscout explicitly signals "no activity on this address"
    if (res.status === 422) {
      return {
        txCount: 0,
        walletAge: null,
        lastActive: null,
        isBuilder: false,
      };
    }
    if (res.ok) {
      const json = (await res.json()) as {
        transaction_count?: unknown;
        tx_count?: unknown;
      };
      txCount = parseBlockscoutTxCount(json);
    }
  }

  if (txsRes.status === 'fulfilled' && txsRes.value.ok) {
    const json = (await txsRes.value.json()) as {
      items?: Array<{ timestamp?: string; to?: unknown }>;
    };
    const items = json.items ?? [];
    lastActive = items[0]?.timestamp ?? null;
    walletAge = items[items.length - 1]?.timestamp ?? null;
    isBuilder = items.some((tx) => tx.to === null || tx.to === '');
  }

  return { txCount, walletAge, lastActive, isBuilder };
}

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
        : 11142220;
    const chainIdParam = searchParams.get('chainId');
    const chainId = chainIdParam ? Number(chainIdParam) : defaultChainId;

    const isMainnetChain =
      chainId === CELO_MAINNET_ID || chainId === BASE_MAINNET_ID;

    const result = isMainnetChain
      ? await fetchFastStatsMainnet(address, chainId)
      : await fetchFastStatsBlockscout(address, chainId);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[scout/fast]', err);
    return NextResponse.json({ error: 'Fast scout failed' }, { status: 500 });
  }
}
