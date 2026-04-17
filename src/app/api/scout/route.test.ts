import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockCreate = vi.fn().mockResolvedValue({
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        trustLevel: 'High',
        headline: 'Active contributor',
        tags: ['Veteran'],
        stats: {
          txCount: 100,
          usdmVolume: '50.00',
          lastActive: '',
          walletAge: '',
        },
      }),
    },
  ],
});

// The route uses `new Anthropic()` — mock must be a real constructor (class)
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

import { GET } from './route';

const VALID_ADDRESS = '0x1234567890123456789012345678901234567890';

const EMPTY_BLOCKSCOUT = {
  ok: true,
  json: () => Promise.resolve({ items: [] }),
};

describe('GET /api/scout', () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    // Ensure no API key → fallback mode
    delete process.env.ANTHROPIC_API_KEY;

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
    expect(body).toHaveProperty('tags');
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
    expect(stats).toHaveProperty('usdmVolume');
    expect(stats).toHaveProperty('lastActive');
    expect(stats).toHaveProperty('walletAge');
  });

  it('fallback tags is an array', async () => {
    const req = new Request(
      `http://localhost/api/scout?address=${VALID_ADDRESS}`,
    );
    const res = await GET(req);
    const body = await res.json();
    expect(Array.isArray(body.tags)).toBe(true);
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
});
