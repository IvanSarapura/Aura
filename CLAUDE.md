# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build (fails on type errors)
npm run lint         # ESLint (no autofix)
npm run typecheck    # TypeScript validation
npm run format       # Prettier formatting
npm test             # Run all tests once
npm run test:watch   # Vitest watch mode
npm run test:coverage
```

To run a single test file: `npx vitest run src/components/WalletInfo.test.tsx`

## Architecture

**Aura** is a Web3 DApp boilerplate using Next.js App Router, Wagmi v2, viem, and RainbowKit. It demonstrates ERC-20 token interactions with multi-chain support.

### Provider hierarchy

```
app/layout.tsx
  → ClientWeb3Provider (dynamic import, ssr: false)
    → Web3Provider (WagmiProvider + QueryClientProvider + RainbowKitProvider)
```

All Web3 providers are split into a server-safe wrapper (`providers/Web3Provider.tsx`) and a dynamic client import (`providers/ClientWeb3Provider.tsx`) to avoid SSR issues.

### Configuration layer (`src/config/`)

- **`env.ts`** — single source of truth for all `NEXT_PUBLIC_*` env vars; validates at import time
- **`chains.ts`** — active chain list driven by `NEXT_PUBLIC_CHAIN_PROFILE` (`testnet` | `mainnet`); exports explorer URL helpers
- **`contracts.ts`** — contract address registry keyed by chain ID
- **`wagmi.ts`** — Wagmi + RainbowKit config assembled from the above

### Transaction lifecycle pattern

Every write operation in `src/hooks/useErc20Transfer.ts` follows this 3-step flow:

1. `useSimulateContract` — preflight simulation (catches reverts before wallet prompt)
2. `useWriteContract` — triggers wallet signing
3. `useWaitForTransactionReceipt` — polls until block inclusion

### Form validation (2-level)

- **Schema level**: Zod schemas in `src/lib/schemas/` + React Hook Form
- **Contract level**: `useSimulateContract` result surfaces on-chain business logic errors

### Testing conventions

Tests use Vitest + `@testing-library/react` with jsdom. Wagmi hooks are mocked with `vi.mock('wagmi')`. Cast hook return types as `as unknown as ReturnType<typeof hook>` when mocking.

## Multi-chain support

- Testnet profile: Sepolia, Base Sepolia, Avalanche Fuji
- Mainnet profile: Ethereum, Base, Avalanche
- Profile is set via `NEXT_PUBLIC_CHAIN_PROFILE`; defaults to `testnet`

## Environment variables

Copy `.env.local.example` to `.env.local`. Only `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is required for production. The CI pipeline injects `ci-placeholder` for the build step.

## Linting / formatting

Pre-commit hooks (Husky + lint-staged) auto-fix ESLint and Prettier on staged `.ts`, `.tsx`, `.css`, `.json`, and `.md` files. The CI pipeline runs `format:check`, `lint`, `typecheck`, `test`, and `build` in sequence.
