# Aura ✦

> **Wallet reputation + micro-payments on Celo**

Aura turns any Celo wallet address into a portable trust profile. An AI Scout reads on-chain history in real time and distills it into a human-readable reputation card — so anyone can tip, pay, or collaborate with confidence, even with strangers.

Built for MiniPay and Celo Mainnet. No database. No accounts. Just wallets.

---

## The Problem

Crypto payments between strangers carry zero social context. You see an address — not a person. Before sending money you have no idea if the counterparty is a veteran DeFi power user, a new wallet, or a builder with dozens of deployed contracts. This friction slows down peer-to-peer payments, freelance work, and community tipping.

## The Solution

Paste any address into Aura and get back:

- **Trust Level** — Low / Medium / High, derived from real on-chain activity
- **Builder badge** — detected from contract deployment history
- **AI headline** — one-sentence summary written by Claude Haiku
- **Activity tags** — "Veteran", "DeFi User", "Builder", etc.
- **Stats panel** — transaction count, stablecoin volume, wallet age, last active date
- **Payment form** — tip with USDm, USDC, or USDT in two taps
- **Tip feed** — history of every tip received and sent, decoded from chain events
- **Shareable link + QR code** — your Aura profile URL, ready to post anywhere

Every tip compounds the sender's reputation. Over time, the chain of tips becomes social proof.

---

## Live Demo

| Network      | Contract                               |
| ------------ | -------------------------------------- |
| Celo Mainnet | `NEXT_PUBLIC_AURA_TIP_ADDRESS_MAINNET` |
| Celo Sepolia | `NEXT_PUBLIC_AURA_TIP_ADDRESS_TESTNET` |

---

## Stack

| Layer           | Technology                         |
| --------------- | ---------------------------------- |
| Framework       | Next.js 16 (App Router)            |
| UI              | React 19 + CSS Modules             |
| Web3            | Wagmi v2 + viem v2 + RainbowKit v2 |
| AI              | Claude Haiku via Anthropic SDK     |
| Smart contracts | Solidity 0.8.24 + Hardhat 3        |
| Blockchain      | Celo Mainnet + Celo Sepolia        |
| Forms           | React Hook Form v7 + Zod v4        |
| State           | TanStack React Query v5            |
| Tests           | Vitest v4 + Testing Library        |

---

## Architecture

### Request flow

```
User enters address
       │
       ▼
GET /api/scout?address=0x...
       │
       ├── Blockscout / CeloScan  ─── tx count, USDm volume, wallet age
       ├── Contract deployment check  ─── isBuilder flag
       └── Claude Haiku  ────────────── trust level, headline, tags
                                        (heuristic fallback if no API key)
       │
       ▼
ReceiverProfile renders ImpactCard + TipForm + TipFeed
       │
       ├── TipForm submits → useAuraTip hook
       │         approve ERC-20 →─── wait for receipt →─── tip() ───► TipSent event
       │
       └── TipFeed polls GET /api/tips
                   CeloScan getLogs (topic0 + topic2) → decodeCeloscanLogs()
```

### Provider hierarchy

```
layout.tsx
  └── ClientWeb3Provider  (dynamic import, ssr: false)
        └── Web3Provider
              ├── WagmiProvider
              ├── QueryClientProvider
              └── RainbowKitProvider
```

### Transaction lifecycle (two-step ERC-20 flow)

```
useAuraTip:

idle ──► [submit]
          │
          ├─ needsApproval = true
          │     useSimulateContract(approve)  ──► approving
          │     writeContractAsync(approve)
          │     useWaitForTransactionReceipt  ──► publicClient.simulateContract(tip)
          │                                       writeContractAsync(tip)
          │
          └─ needsApproval = false
                useSimulateContract(tip)      ──► tipping
                writeContractAsync(tip)

tipping ──► useWaitForTransactionReceipt ──► success | error
```

---

## Smart Contract

`AuraTip.sol` is intentionally minimal:

```solidity
contract AuraTip {
    event TipSent(
        address indexed from,
        address indexed to,
        address indexed token,
        uint256 amount,
        string  category,
        string  message
    );

    function tip(
        address recipient,
        uint256 amount,
        address token,
        string calldata category,
        string calldata message
    ) external { ... }
}
```

**Design decisions:**

- No constructor arguments — deterministic deployment, easy to re-deploy
- No owner — immutable and trustless
- No escrow — direct ERC-20 `transferFrom` to recipient
- No fees — Celo gas is fractions of a cent
- Any ERC-20 token accepted — frontend enforces the curated whitelist
- All business logic lives in the `TipSent` event — chain = source of truth

---

## Token Support

| Network      | Token    | Address                                      | Decimals |
| ------------ | -------- | -------------------------------------------- | -------- |
| Celo Mainnet | USDm     | `0x765DE816845861e75A25fCA122bb6898B8B1282a` | 18       |
| Celo Mainnet | USDC     | `0xceba9300f2b948710d2653dd7b07f33a8b32118c` | 6        |
| Celo Mainnet | USDT     | `0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e` | 6        |
| Celo Sepolia | MockUSDm | `NEXT_PUBLIC_USDM_ADDRESS_TESTNET`           | 18       |

---

## AI Scout

The `/api/scout` route fetches raw on-chain stats, then calls Claude Haiku with a structured prompt:

```
Stats:
- Transactions: 312
- USDm volume: $1,420.00
- Wallet age: 847 days
- Last active: 14 days ago
- Builder (deployed contracts): true

Return JSON: { trustLevel, headline, tags[] }
```

Claude returns:

```json
{
  "trustLevel": "High",
  "headline": "Veteran DeFi user with consistent on-chain presence",
  "tags": ["Veteran", "Builder", "DeFi User"]
}
```

If `ANTHROPIC_API_KEY` is not set, a deterministic heuristic computes the same fields from the stats — no AI key required for the app to function.

---

## Project Structure

```
Aura/
├── contracts/
│   ├── contracts/
│   │   ├── AuraTip.sol          # Stateless multi-token tip contract
│   │   └── MockUSDm.sol         # ERC-20 mock for testnet
│   ├── scripts/
│   │   └── deploy.ts            # Auto-detects chain, deploys correct set
│   ├── test/
│   │   └── AuraTip.ts           # Hardhat tests
│   └── hardhat.config.ts        # Celo Mainnet + Celo Sepolia networks
│
└── src/
    ├── abi/
    │   ├── auraTip.ts            # AuraTip ABI (as const for type inference)
    │   └── erc20.ts              # Minimal ERC-20 ABI
    │
    ├── app/
    │   ├── layout.tsx            # Root layout: metadata, fonts, providers
    │   ├── page.tsx              # Home: hero + AddressInput
    │   ├── [address]/
    │   │   ├── page.tsx          # Profile route: address validation + ReceiverProfile
    │   │   ├── loading.tsx       # Suspense skeleton
    │   │   └── error.tsx         # Error boundary
    │   ├── api/
    │   │   ├── scout/route.ts    # GET /api/scout — AI reputation analysis
    │   │   └── tips/route.ts     # GET /api/tips — on-chain tip history
    │   └── globals.css           # Design tokens, keyframes, CSS reset
    │
    ├── components/
    │   ├── AddressInput/         # Address form with viem validation
    │   ├── ConnectButton/        # RainbowKit custom button
    │   ├── ImpactCard/           # Trust meter, builder badge, stats
    │   ├── PaymentLink/          # URL + copy + QR code
    │   ├── ReceiverProfile/      # Profile page composition
    │   ├── SelfProfileBanner/    # Own-profile banner with share actions
    │   ├── ShareCard/            # Post-tip receipt with social sharing
    │   ├── TipFeed/              # On-chain tip history list
    │   ├── TipForm/              # Multi-token payment form
    │   └── TxStatus/             # Transaction phase indicator
    │
    ├── config/
    │   ├── chains.ts             # Celo chain definitions + explorer helpers
    │   ├── contracts.ts          # Contract addresses + token registry per chain
    │   ├── env.ts                # Environment variable validation
    │   ├── theme.ts              # RainbowKit dark theme (Celo green accent)
    │   └── wagmi.ts              # Wagmi + RainbowKit config
    │
    ├── hooks/
    │   ├── useAuraTip.ts         # Two-step approve → tip orchestration
    │   ├── useMiniPay.ts         # MiniPay detection + auto-connect
    │   ├── useScout.ts           # React Query wrapper for /api/scout
    │   └── useTips.ts            # React Query wrapper for /api/tips
    │
    ├── lib/
    │   ├── schemas/tip.ts        # Zod schema for TipForm validation
    │   └── tipEvents.ts          # TipSent log decoding (CeloScan + Blockscout)
    │
    └── providers/
        ├── ClientWeb3Provider.tsx  # dynamic() wrapper (ssr: false)
        └── Web3Provider.tsx        # Wagmi + QueryClient + RainbowKit tree
```

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd Aura
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Required
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=   # from cloud.reown.com

# Chain profile
NEXT_PUBLIC_CHAIN_PROFILE=testnet       # or mainnet

# AI Scout (optional — heuristic fallback if unset)
ANTHROPIC_API_KEY=

# CeloScan (needed for tip history on mainnet)
NEXT_PUBLIC_CELOSCAN_API_KEY=

# Alchemy RPC (needed for contract deployment)
ALCHEMY_API_KEY=

# Contract addresses (set after deploying)
NEXT_PUBLIC_AURA_TIP_ADDRESS_TESTNET=
NEXT_PUBLIC_AURA_TIP_ADDRESS_MAINNET=
NEXT_PUBLIC_USDM_ADDRESS_TESTNET=

# Deployer wallet (server-side only — never prefix with NEXT_PUBLIC_)
DEPLOYER_PRIVATE_KEY=
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Contract Deployment

### Testnet (Celo Sepolia)

```bash
npm run contracts:deploy:testnet
```

Output:

```
Deploying on chain 11142220 from 0x...
Testnet: deploying MockUSDm...
MockUSDm deployed: 0x...
Deploying AuraTip...
AuraTip deployed: 0x...

── Copy this into .env.local ──────────────────────
NEXT_PUBLIC_AURA_TIP_ADDRESS_TESTNET=0x...
NEXT_PUBLIC_USDM_ADDRESS_TESTNET=0x...
────────────────────────────────────────────────────
```

Copy the output values into `.env.local`, then restart the dev server.

### Verify on Blockscout (testnet)

```bash
cd contracts
npx hardhat verify --network celoSepolia <AURA_TIP_ADDRESS>
npx hardhat verify --network celoSepolia <MOCK_USDM_ADDRESS>
```

### Mainnet (Celo)

Once testnet is validated:

```bash
npm run contracts:deploy:mainnet
```

### Verify on CeloScan (mainnet)

```bash
cd contracts
npx hardhat verify --network celo <AURA_TIP_ADDRESS>
```

---

## Available Scripts

| Command                            | Description                             |
| ---------------------------------- | --------------------------------------- |
| `npm run dev`                      | Start Next.js dev server                |
| `npm run build`                    | Production build (fails on type errors) |
| `npm run typecheck`                | TypeScript validation                   |
| `npm run lint`                     | ESLint                                  |
| `npm run format`                   | Prettier autofix                        |
| `npm test`                         | Run all tests                           |
| `npm run test:watch`               | Vitest watch mode                       |
| `npm run test:coverage`            | Coverage report                         |
| `npm run contracts:compile`        | Compile Solidity contracts              |
| `npm run contracts:test`           | Run Hardhat tests                       |
| `npm run contracts:deploy:testnet` | Deploy to Celo Sepolia                  |
| `npm run contracts:deploy:mainnet` | Deploy to Celo Mainnet                  |

---

## Environment Variables Reference

| Variable                               | Required     | Description                                                   |
| -------------------------------------- | ------------ | ------------------------------------------------------------- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Yes (prod)   | Reown project ID — [cloud.reown.com](https://cloud.reown.com) |
| `NEXT_PUBLIC_CHAIN_PROFILE`            | No           | `testnet` (default) or `mainnet`                              |
| `NEXT_PUBLIC_APP_NAME`                 | No           | Wallet modal display name                                     |
| `ANTHROPIC_API_KEY`                    | No           | Claude API key for AI Scout                                   |
| `NEXT_PUBLIC_CELOSCAN_API_KEY`         | No           | CeloScan API key for tip history + verification               |
| `ALCHEMY_API_KEY`                      | No           | Alchemy RPC key for deploys                                   |
| `NEXT_PUBLIC_AURA_TIP_ADDRESS_MAINNET` | After deploy | AuraTip on Celo Mainnet                                       |
| `NEXT_PUBLIC_AURA_TIP_ADDRESS_TESTNET` | After deploy | AuraTip on Celo Sepolia                                       |
| `NEXT_PUBLIC_USDM_ADDRESS_TESTNET`     | After deploy | MockUSDm on Celo Sepolia                                      |
| `DEPLOYER_PRIVATE_KEY`                 | For deploy   | Deployer private key (server-only)                            |

---

## MiniPay Integration

Aura is optimized for [MiniPay](https://minipay.opera.com/), Opera's mobile wallet with millions of users in Africa:

- **Max width 430px** layout matches MiniPay's viewport
- **48px minimum touch targets** on all interactive elements
- **Auto-connect** via `useMiniPay` hook: detects `window.ethereum.isMiniPay` and connects the injected wallet automatically
- **QR codes** for offline payment link sharing
- **MiniPay deeplinks** in the ShareCard (shown only inside MiniPay)
- **`env(safe-area-inset-bottom)`** for iOS notch handling

---

## Key Design Decisions

**Stateless contract.** AuraTip holds no state beyond emitting events. Reputation is derived client-side from the immutable event log — nothing can be deleted or manipulated.

**No database.** Every profile is computed on demand from chain data. There are no users, no accounts, no passwords. A wallet address is the only identity primitive.

**Heuristic fallback.** The AI Scout degrades gracefully. Without an Anthropic key, a deterministic algorithm computes trust level from stats. The app is fully functional either way.

**Decimal-aware multi-token.** USDC and USDT use 6 decimals; USDm uses 18. The token registry stores decimals per token and `parseUnits(amount, token.decimals)` is called at the form layer — preventing silent precision loss.

**Post-approval re-simulation.** After the ERC-20 approve confirms on-chain, the `tip()` call is re-simulated via `publicClient.simulateContract()` with fresh RPC state. This avoids the "simulation unavailable" bug that occurs when the pre-flight simulation runs against insufficient allowance.

---

## Testing

```bash
npm test
```

54 tests across 6 suites covering:

| Suite                   | What it tests                                   |
| ----------------------- | ----------------------------------------------- |
| `AddressInput.test.tsx` | Validation, accessibility, submit callback      |
| `ImpactCard.test.tsx`   | All trust levels, builder badge, stat rendering |
| `ShareCard.test.tsx`    | Social links, MiniPay deeplink gating           |
| `useAuraTip.test.ts`    | Phase transitions, approve flow, error handling |
| `useScout.test.ts`      | React Query behavior, loading/error states      |
| `useMiniPay.test.ts`    | MiniPay detection, auto-connect logic           |

Wagmi hooks are mocked with `vi.mock('wagmi')`. Cast return types as `as unknown as ReturnType<typeof hook>` to avoid implementing internal Wagmi types.

---

## CI / CD

GitHub Actions pipeline on every push to `main` and pull request:

```
format:check → lint → typecheck → test → build
```

`.env.local` values injected in CI:

```yaml
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: ci-placeholder
NEXT_PUBLIC_CHAIN_PROFILE: testnet
```

Pre-commit hooks (Husky + lint-staged) auto-fix ESLint and Prettier on staged files before each commit.

---

## License

[MIT](./LICENSE)
