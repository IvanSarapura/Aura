// ── MiniPay: environment detection (non-React) ───────────────────────────────
// Pure helper — safe to call anywhere (hooks, config, non-component code)
// without violating rules of hooks. MiniPay injects window.ethereum.isMiniPay
// synchronously before the first JS execution, so this is always stable.

type MiniPayEthereum = { isMiniPay?: boolean };

export function isMiniPayEnvironment(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!(window as Window & { ethereum?: MiniPayEthereum }).ethereum?.isMiniPay
  );
}
