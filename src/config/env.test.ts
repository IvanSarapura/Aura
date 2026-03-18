import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('env', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('throws when NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID', '');

    await expect(() => import('./env')).rejects.toThrow(
      'Missing required environment variable: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
    );
  });

  it('throws when NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is only whitespace', async () => {
    vi.stubEnv('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID', '   ');

    await expect(() => import('./env')).rejects.toThrow(
      'Missing required environment variable',
    );
  });

  it('returns trimmed project ID when set', async () => {
    vi.stubEnv('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID', '  abc123def456  ');

    const { env } = await import('./env');
    expect(env.walletConnectProjectId).toBe('abc123def456');
  });

  it('uses default app name when NEXT_PUBLIC_APP_NAME is not set', async () => {
    vi.stubEnv('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID', 'test-id');
    vi.stubEnv('NEXT_PUBLIC_APP_NAME', '');

    const { env } = await import('./env');
    expect(env.appName).toBe('My Web3 App');
  });

  it('uses custom app name when provided', async () => {
    vi.stubEnv('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID', 'test-id');
    vi.stubEnv('NEXT_PUBLIC_APP_NAME', 'My Custom DApp');

    const { env } = await import('./env');
    expect(env.appName).toBe('My Custom DApp');
  });
});
