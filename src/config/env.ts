function pub(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

export const env = {
  walletConnectProjectId: pub('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID').trim(),
  chainProfile: pub('NEXT_PUBLIC_CHAIN_PROFILE', 'testnet') as
    | 'testnet'
    | 'mainnet',
  appName: pub('NEXT_PUBLIC_APP_NAME', 'Aura'),
  celoscanApiKey: pub('NEXT_PUBLIC_CELOSCAN_API_KEY'),
} as const;
