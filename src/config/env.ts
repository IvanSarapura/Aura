function requireEnv(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `Copy .env.local.example to .env.local and fill in the values.`,
    );
  }
  return value.trim();
}

export const env = {
  walletConnectProjectId: requireEnv(
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  ),
  appName:
    process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'My Web3 App',
} as const;
