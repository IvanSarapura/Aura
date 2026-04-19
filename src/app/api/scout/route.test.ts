import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { TipEvent } from '@/lib/tipEvents';

vi.mock('@/lib/fetchTips', () => ({
  fetchTips: vi.fn().mockResolvedValue([]),
}));

const mockCreate = vi.fn().mockResolvedValue({
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        trustLevel: 'High',
        headline: 'Active contributor',
      }),
    },
  ],
});

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

import { GET } from './route';
import { fetchTips } from '@/lib/fetchTips';

const VALID_ADDRESS = '0x1234567890123456789012345678901234567890';

const EMPTY_BLOCKSCOUT = {
  ok: true,
  json: () => Promise.resolve({ items: [] }),
};

function makeTipEvent(overrides?: Partial<TipEvent>): TipEvent {
  return {
    from: '0xaaaa000000000000000000000000000000000001' as `0x${string}`,
    to: VALID_ADDRESS as `0x${string}`,
    token: '0x0000000000000000000000000000000000000002' as `0x${string}`,
    tokenSymbol: 'mUSDm',
    amount: '5.00',
    category: 'design',
    message: 'great work',
    timestamp: '2024-01-01T00:00:00Z',
    txHash: '0xhash',
    ...overrides,
  };
}

describe('GET /api/scout', () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    vi.mocked(fetchTips).mockResolvedValue([]);
    global.fetch = vi
      .fn()
      .mockResolvedValue(EMPTY_BLOCKSCOUT) as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalApiKey;
  });

  it('returns 400 for missing address param', async () => {
    const req = new Request('http://localhost/api/scout');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for malformed address', async () => {
    const req = new Request(
      'http://localhost/api/scout?address=not-an-address',
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for address that is too short', async () => {
    const req = new Request('http://localhost/api/scout?address=0x1234');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 200 with fallback ScoutResult when no API key', async () => {
    const req = new Request(
      `http://localhost/api/scout?address=${VALID_ADDRESS}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('trustLevel');
    expect(body).toHaveProperty('headline');
    expect(body).toHaveProperty('stats');
  });

  it('fallback trustLevel is Low, Medium, or High', async () => {
    const req = new Request(
      `http://localhost/api/scout?address=${VALID_ADDRESS}`,
    );
    const res = await GET(req);
    const body = await res.json();
    expect(['Low', 'Medium', 'High']).toContain(body.trustLevel);
  });

  it('fallback stats contains required fields', async () => {
    const req = new Request(
      `http://localhost/api/scout?address=${VALID_ADDRESS}`,
    );
    const res = await GET(req);
    const body = await res.json();
    const { stats } = body;
    expect(stats).toHaveProperty('txCount');
    expect(stats).toHaveProperty('stablecoinVolume');
    expect(stats).toHaveProperty('lastActive');
    expect(stats).toHaveProperty('walletAge');
  });

  it('calls Anthropic SDK when ANTHROPIC_API_KEY is set', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockClear();

    const req = new Request(
      `http://localhost/api/scout?address=${VALID_ADDRESS}`,
    );
    await GET(req);

    expect(mockCreate).toHaveBeenCalled();
  });

  // ── AuraStats ────────────────────────────────────────────────────────────────

  it('fallback response includes auraStats field', async () => {
    const req = new Request(
      `http://localhost/api/scout?address=${VALID_ADDRESS}`,
    );
    const res = await GET(req);
    const body = await res.json();
    expect(body).toHaveProperty('auraStats');
  });

  it('auraStats has expected shape when tips are empty', async () => {
    const req = new Request(
      `http://localhost/api/scout?address=${VALID_ADDRESS}`,
    );
    const res = await GET(req);
    const { auraStats } = await res.json();
    expect(auraStats).toMatchObject({
      tipsReceived: 0,
      tipsSent: 0,
      uniqueTippers: 0,
      topCategories: [],
      totalVolumeReceived: '0.00',
    });
  });

  it('trust upgrades to Medium when wallet has 3+ received tips', async () => {
    vi.mocked(fetchTips).mockImplementation(async (_addr, type) =>
      type === 'received'
        ? [makeTipEvent(), makeTipEvent(), makeTipEvent()]
        : [],
    );

    const req = new Request(
      `http://localhost/api/scout?address=${VALID_ADDRESS}`,
    );
    const res = await GET(req);
    const body = await res.json();
    expect(body.trustLevel).toBe('Medium');
  });

  it('trust upgrades to High when wallet has 10+ tips with 3+ unique tippers', async () => {
    const tippers = [
      '0xaaaa000000000000000000000000000000000001',
      '0xbbbb000000000000000000000000000000000002',
      '0xcccc000000000000000000000000000000000003',
    ] as const;
    const received = Array.from({ length: 10 }, (_, i) =>
      makeTipEvent({ from: tippers[i % 3] as `0x${string}` }),
    );
    vi.mocked(fetchTips).mockImplementation(async (_addr, type) =>
      type === 'received' ? received : [],
    );

    const req = new Request(
      `http://localhost/api/scout?address=${VALID_ADDRESS}`,
    );
    const res = await GET(req);
    const body = await res.json();
    expect(body.trustLevel).toBe('High');
  });

  it('Claude path preserves server-computed auraStats', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    vi.mocked(fetchTips).mockImplementation(async (_addr, type) =>
      type === 'received' ? [makeTipEvent(), makeTipEvent()] : [],
    );

    const req = new Request(
      `http://localhost/api/scout?address=${VALID_ADDRESS}`,
    );
    const res = await GET(req);
    const body = await res.json();
    expect(body.auraStats).not.toBeNull();
    expect(body.auraStats.tipsReceived).toBe(2);
  });

  it('topCategories sorted by frequency', async () => {
    vi.mocked(fetchTips).mockImplementation(async (_addr, type) =>
      type === 'received'
        ? [
            makeTipEvent({ category: 'code' }),
            makeTipEvent({ category: 'code' }),
            makeTipEvent({ category: 'design' }),
          ]
        : [],
    );

    const req = new Request(
      `http://localhost/api/scout?address=${VALID_ADDRESS}`,
    );
    const res = await GET(req);
    const body = await res.json();
    expect(body.auraStats.topCategories[0]).toBe('code');
  });

  it('walletAge and lastActive are null when no transactions', async () => {
    const req = new Request(
      `http://localhost/api/scout?address=${VALID_ADDRESS}`,
    );
    const res = await GET(req);
    const { stats } = await res.json();
    expect(stats.lastActive).toBeNull();
    expect(stats.walletAge).toBeNull();
  });
});
