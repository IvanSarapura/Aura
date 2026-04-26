# Aura ✦

> **Wallet reputation + micro-payments on Celo and Base**

Aura turns any EVM wallet address into a portable trust profile. An AI Scout reads on-chain history in real time and distills it into a human-readable reputation card — so anyone can tip, pay, or collaborate with confidence, even with strangers.

Built for MiniPay, Celo, and Base. No database. No accounts. Just wallets.

---

## The Problem

Crypto payments between strangers carry zero social context. You see an address — not a person. Before sending money you have no idea if the counterparty is a veteran DeFi power user, a new wallet, or a builder with dozens of deployed contracts. This friction slows down peer-to-peer payments, freelance work, and community tipping.

## The Solution

Paste any address into Aura and get back:

- **Trust Level** — Low / Medium / High, derived from real on-chain activity
- **Builder badge** — detected from contract deployment history
- **AI headline** — one-sentence summary written by Claude Haiku
- **Stats panel** — tx count, stablecoin volume, wallet age, last active date
- **Aura stats** — tips received/sent, unique tippers, top categories, total volume
- **Payment form** — tip with any supported stablecoin in two taps
- **Tip feed** — history of every tip received and sent, decoded from chain events
- **Shareable link + QR code** — your Aura profile URL, ready to post anywhere

Every tip compounds the sender's reputation. Over time, the chain of tips becomes social proof.

---

## Live Demo

| Network      | Env var                                     |
| ------------ | ------------------------------------------- |
| Celo Mainnet | `NEXT_PUBLIC_AURA_TIP_ADDRESS_MAINNET`      |
| Celo Sepolia | `NEXT_PUBLIC_AURA_TIP_ADDRESS_TESTNET`      |
| Base Mainnet | `NEXT_PUBLIC_AURA_TIP_ADDRESS_BASE_MAINNET` |
| Base Sepolia | `NEXT_PUBLIC_AURA_TIP_ADDRESS_BASE_SEPOLIA` |

---

## Stack

| Layer           | Technology                         |
| --------------- | ---------------------------------- |
| Framework       | Next.js 16 (App Router)            |
| UI              | React 19 + CSS Modules             |
| Web3            | Wagmi v2 + viem v2 + RainbowKit v2 |
| AI              | Claude Haiku via Anthropic SDK     |
| Smart contracts | Solidity 0.8.24 + Hardhat 3        |
| Blockchain      | Celo + Base (mainnet & testnet)    |
| Forms           | React Hook Form v7 + Zod v4        |
| State           | TanStack React Query v5            |
| Tests           | Vitest v4 + Testing Library        |

---

## Architecture

### Request flow

```
User enters address
       │
       ├── GET /api/scout/fast?address=0x...  ← resolves in ~1-2 s
       │         ├── Etherscan V2 / Blockscout  ─── walletAge, lastActive
       │         └── Blockscout              ─── txCount, isBuilder
       │
       └── GET /api/scout?address=0x...        ← resolves in ~5-12 s
                 ├── Etherscan V2 / Blockscout  ─── tx count, stablecoin volume, wallet age
                 ├── Contract deployment check  ─── isBuilder flag
                 ├── fetchTips()               ─── aura-native stats (sent/received/volume)
                 └── Claude Haiku             ─── trust level, headline
                                               (heuristic fallback if no API key)
       │
       ▼
ReceiverProfile renders ImpactCard + TipForm + TipFeed
  ImpactCard shows fast data immediately, upgrades to full data when ready
       │
       ├── TipForm submits → useAuraTip hook
       │         approve ERC-20 →─── wait for receipt
       │         poll allowance (8× @ 1.5s) →─── re-simulate tip()
       │         writeContractAsync(tip) ───► TipSent event
       │
       └── TipFeed polls GET /api/tips
                   Etherscan V2 / Blockscout getLogs → decodeLogs()
```

### Provider hierarchy

```
layout.tsx
  └── ClientWeb3Provider  (dynamic import, ssr: false)
        └── Web3Provider
              ├── WagmiProvider
              ├── QueryClientProvider
              │     └── MiniPayEffects  (auto-connect side-effect)
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
          │     useWaitForTransactionReceipt
          │     poll allowance (8× @ 1.5 s)   ──► publicClient.simulateContract(tip)
          │                                        writeContractAsync(tip)
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
- No fees — Celo and Base gas are fractions of a cent
- Any ERC-20 token accepted — frontend enforces the curated whitelist
- All business logic lives in the `TipSent` event — chain = source of truth

---

## Token Support

### Mainnet — Celo

| Token | Name                     | Address                                      | Decimals |
| ----- | ------------------------ | -------------------------------------------- | -------- |
| USDm  | Mento Dollar             | `0x765DE816845861e75A25fCA122bb6898B8B1282a` | 18       |
| USDC  | USD Coin                 | `0xceba9300f2b948710d2653dd7b07f33a8b32118c` | 6        |
| USDT  | Tether USD               | `0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e` | 6        |
| EURm  | Mento Euro               | `0xd8763cba276a3738e6de85b4b3bf5fded6d6ca73` | 18       |
| BRLm  | Mento Brazilian Real     | `0xe8537a3d056da446677b9e9d6c5db704eaab4787` | 18       |
| KESm  | Mento Kenyan Shilling    | `0x456a3D042C0DbD3db53D5489e98dFb038553B0d0` | 18       |
| PHPm  | Mento Philippine Peso    | `0x105d4A9306D2E55a71d2Eb95B81553AE1dC20d7B` | 18       |
| COPm  | Mento Colombian Peso     | `0x8a567e2ae79ca692bd748ab832081c45de4041ea` | 18       |
| AUDm  | Mento Australian Dollar  | `0x7175504C455076F15c04A2F90a8e352281F492F9` | 18       |
| ZARm  | Mento South African Rand | `0x4c35853A3B4e647fD266f4de678dCc8fEC410BF6` | 18       |
| GHSm  | Mento Ghanaian Cedi      | `0xfAeA5F3404bbA20D3cc2f8C4B0A888F55a3c7313` | 18       |
| NGNm  | Mento Nigerian Naira     | `0xE2702Bd97ee33c88c8f6f92DA3B733608aa76F71` | 18       |
| JPYm  | Mento Japanese Yen       | `0xc45eCF20f3CD864B32D9794d6f76814aE8892e20` | 18       |

### Mainnet — Base

| Token | Name           | Address                                      | Decimals |
| ----- | -------------- | -------------------------------------------- | -------- |
| USDC  | USD Coin       | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6        |
| USDbC | USD Base Coin  | `0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA` | 6        |
| DAI   | Dai Stablecoin | `0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb` | 18       |

### Testnet — Celo Sepolia

| Token | Name                     | Address                                      | Decimals |
| ----- | ------------------------ | -------------------------------------------- | -------- |
| mUSDm | Mock USDm                | `NEXT_PUBLIC_USDM_ADDRESS_TESTNET`           | 18       |
| USDm  | Mento Dollar             | `0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b` | 18       |
| EURm  | Mento Euro               | `0xA99dC247d6b7B2E3ab48a1fEE101b83cD6aCd82a` | 18       |
| BRLm  | Mento Brazilian Real     | `0x2294298942fdc79417DE9E0D740A4957E0e7783a` | 18       |
| KESm  | Mento Kenyan Shilling    | `0xC7e4635651E3e3Af82b61d3E23c159438daE3BbF` | 18       |
| PHPm  | Mento Philippine Peso    | `0x0352976d940a2C3FBa0C3623198947Ee1d17869E` | 18       |
| COPm  | Mento Colombian Peso     | `0x5F8d55c3627d2dc0a2B4afa798f877242F382F67` | 18       |
| AUDm  | Mento Australian Dollar  | `0x5873Faeb42F3563dcD77F0fbbdA818E6d6DA3139` | 18       |
| ZARm  | Mento South African Rand | `0x10CCfB235b0E1Ed394bACE4560C3ed016697687e` | 18       |
| GHSm  | Mento Ghanaian Cedi      | `0x5e94B8C872bD47BC4255E60ECBF44D5E66e7401C` | 18       |
| NGNm  | Mento Nigerian Naira     | `0x3d5ae86F34E2a82771496D140daFAEf3789dF888` | 18       |
| JPYm  | Mento Japanese Yen       | `0x85Bee67D435A39f7467a8a9DE34a5B73D25Df426` | 18       |

### Testnet — Base Sepolia

| Token | Name               | Address                                      | Decimals |
| ----- | ------------------ | -------------------------------------------- | -------- |
| USDC  | USD Coin (testnet) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | 6        |

---

## AI Scout

The `/api/scout` route fetches raw on-chain stats, then calls Claude Haiku with a structured prompt:

```
Stats:
- Transactions: 312
- Stablecoin volume: $1,420.00
- Wallet age: 847 days
- Last active: 14 days ago
- Builder (deployed contracts): true
- Tips received: 12 | Tips sent: 5
- Unique tippers: 8
- Top categories: work, content, code
```

Claude returns:

```json
{
  "trustLevel": "High",
  "headline": "Veteran DeFi user with consistent on-chain presence"
}
```

The scout result also includes Aura-native stats computed from on-chain tip events:

```typescript
{
  trustLevel: 'Low' | 'Medium' | 'High',
  headline: string,
  isBuilder: boolean,
  stats: {
    txCount: number,
    stablecoinVolume: string | null,  // sum across all isStablecoin tokens; null = API failed
    lastActive: string | null,
    walletAge: string | null
  },
  auraStats: {
    tipsReceived: number,
    tipsSent: number,
    uniqueTippers: number,
    topCategories: string[],
    totalVolumeReceived: string
  } | null
}
```

If `ANTHROPIC_API_KEY` is not set, a deterministic heuristic computes the same fields from the stats — no AI key required for the app to function.

### Two-phase loading

The profile page fires two parallel requests to prioritise perceived performance:

| Route             | Data returned                                                                   | Typical latency |
| ----------------- | ------------------------------------------------------------------------------- | --------------- |
| `/api/scout/fast` | `txCount`, `walletAge`, `lastActive`, `isBuilder`                               | ~1-2 s          |
| `/api/scout`      | Full result including `trustLevel`, `headline`, `stablecoinVolume`, `auraStats` | ~5-12 s         |

`ImpactCard` displays fast data immediately and upgrades in place when the full result arrives. Both routes use Etherscan V2 for mainnet chains (with Blockscout fallback) and Blockscout directly for testnets.

---

## MiniPay Integration

Aura is optimised for [MiniPay](https://minipay.opera.com/), Opera's mobile wallet with millions of users in Africa:

- **Max width 430 px** layout matches MiniPay's viewport
- **48 px minimum touch targets** on all interactive elements
- **Auto-connect** via `useMiniPay` hook — detects `window.ethereum.isMiniPay` and connects the injected wallet automatically, no user tap required
- **CIP-42 fee abstraction** — gas paid in USDm instead of CELO; `feeCurrency` is injected into every `writeContractAsync` call and simulation when inside MiniPay
- **"Add Cash" deeplink** — displayed inside MiniPay after a successful tip, to top up balance without leaving the app
- **QR codes** for offline payment link sharing outside MiniPay
- **`env(safe-area-inset-bottom)`** for iOS notch handling

---

## Routes

| Route                  | Description                                                         |
| ---------------------- | ------------------------------------------------------------------- |
| `/`                    | Homepage: address search + connect wallet                           |
| `/[address]`           | Profile: ImpactCard + TipForm + TipFeed (recent 3 tips)             |
| `/[address]/tips`      | Full received-tips page with filter bar                             |
| `/[address]/tips-sent` | Full sent-tips page (guarded: only visible to the wallet owner)     |
| `GET /api/scout`       | Full wallet reputation analysis — trust level, headline, aura stats |
| `GET /api/scout/fast`  | Quick wallet stats: txCount, walletAge, lastActive, isBuilder       |
| `GET /api/tips`        | Paginated tip history — `?address=&type=received\|sent&page=1`      |

---

## Tip Filtering

The full-page tip views (`/tips` and `/tips-sent`) include a live filter bar:

| Filter       | Type     | Behaviour                                |
| ------------ | -------- | ---------------------------------------- |
| Min amount   | number   | Hide tips below this value               |
| Max amount   | number   | Hide tips above this value               |
| Category     | dropdown | Derived from the actual tips in the feed |
| Peer address | text     | Prefix-match on the counterparty address |

Filters apply client-side via `useDeferredValue` for zero-lag typing. A badge shows the number of active filters; a "Clear all" button resets them.

---

## Project Structure

```
Aura/
├── contracts/
│   ├── contracts/
│   │   ├── AuraTip.sol           # Stateless multi-token tip contract
│   │   └── MockUSDm.sol          # ERC-20 mock for testnet
│   ├── scripts/
│   │   └── deploy.ts             # Auto-detects chain, deploys correct set
│   ├── test/
│   │   └── AuraTip.ts            # Hardhat tests
│   └── hardhat.config.ts         # Celo + Base mainnet & testnet networks
│
└── src/
    ├── abi/
    │   ├── auraTip.ts             # AuraTip ABI (as const for type inference)
    │   └── erc20.ts               # Minimal ERC-20 ABI
    │
    ├── app/
    │   ├── layout.tsx             # Root layout: metadata, fonts, providers
    │   ├── page.tsx               # Home: hero + AddressInput
    │   ├── [address]/
    │   │   ├── page.tsx           # Profile route: ReceiverProfile
    │   │   ├── tips/page.tsx      # Full received-tips list with filters
    │   │   ├── tips-sent/page.tsx # Full sent-tips list (wallet-gated)
    │   │   ├── loading.tsx        # Suspense skeleton
    │   │   └── error.tsx          # Error boundary
    │   ├── api/
    │   │   ├── scout/
    │   │   │   ├── route.ts       # GET /api/scout — full AI reputation analysis
    │   │   │   └── fast/
    │   │   │       └── route.ts   # GET /api/scout/fast — quick wallet stats
    │   │   └── tips/route.ts      # GET /api/tips — paginated tip history
    │   └── globals.css            # Design tokens, keyframes, CSS reset
    │
    ├── components/
    │   ├── AddressInput/          # Address form with viem validation
    │   ├── CategorySelect/        # Tip category dropdown
    │   ├── ConnectButton/         # RainbowKit custom button
    │   ├── ImpactCard/            # Trust meter, builder badge, stats (two-phase)
    │   ├── PaymentLink/           # URL + copy + QR code
    │   ├── ReceiverProfile/       # Profile page composition
    │   ├── SelfProfileBanner/     # Own-profile banner with share actions
    │   ├── SentTipsGuard/         # Access control for tips-sent route
    │   ├── ShareCard/             # Post-tip receipt with social sharing
    │   ├── TipFeed/               # On-chain tip history + filter bar
    │   ├── TipFilterBar/          # Amount / category / peer filter UI
    │   ├── TipForm/               # Multi-token payment form
    │   ├── TokenSelect/           # Token picker for TipForm
    │   └── TxStatus/              # Transaction phase indicator
    │
    ├── config/
    │   ├── chains.ts              # Celo + Base chain definitions + explorer helpers
    │   ├── contracts.ts           # Contract addresses + token registry per chain
    │   ├── env.ts                 # Environment variable validation
    │   ├── theme.ts               # RainbowKit dark theme (Celo green accent)
    │   └── wagmi.ts               # Wagmi + RainbowKit config
    │
    ├── hooks/
    │   ├── useAuraTip.ts          # Two-step approve → tip orchestration
    │   ├── useMiniPay.ts          # MiniPay detection + auto-connect
    │   ├── useScout.ts            # React Query wrapper for /api/scout (full analysis)
    │   ├── useScoutFast.ts        # React Query wrapper for /api/scout/fast (quick stats)
    │   └── useTips.ts             # React Query wrapper for /api/tips
    │
    ├── lib/
    │   ├── schemas/tip.ts         # Zod schema for TipForm validation
    │   └── tipEvents.ts           # TipSent log decoding (Etherscan V2 + Blockscout)
    │
    └── providers/
        ├── ClientWeb3Provider.tsx   # dynamic() wrapper (ssr: false)
        └── Web3Provider.tsx         # Wagmi + QueryClient + RainbowKit tree
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

# Etherscan V2 unified key (needed for Scout wallet stats on Celo/Base mainnet
# and for tip history). One key covers all supported chains via the V2 multichain API.
ETHERSCAN_API_KEY=

# Contract addresses — Celo (set after deploying)
NEXT_PUBLIC_AURA_TIP_ADDRESS_MAINNET=
NEXT_PUBLIC_AURA_TIP_ADDRESS_TESTNET=
NEXT_PUBLIC_USDM_ADDRESS_TESTNET=

# Contract addresses — Base (set after deploying)
NEXT_PUBLIC_AURA_TIP_ADDRESS_BASE_MAINNET=
NEXT_PUBLIC_AURA_TIP_ADDRESS_BASE_SEPOLIA=

# Alchemy RPC (needed for contract deployment)
ALCHEMY_API_KEY=

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
| `npm start`                        | Start production server                 |
| `npm run typecheck`                | TypeScript validation                   |
| `npm run lint`                     | ESLint                                  |
| `npm run format`                   | Prettier autofix                        |
| `npm run format:check`             | Prettier check (used in CI)             |
| `npm test`                         | Run all tests                           |
| `npm run test:watch`               | Vitest watch mode                       |
| `npm run test:coverage`            | Coverage report                         |
| `npm run contracts:compile`        | Compile Solidity contracts              |
| `npm run contracts:test`           | Run Hardhat tests                       |
| `npm run contracts:deploy:testnet` | Deploy to Celo Sepolia                  |
| `npm run contracts:deploy:mainnet` | Deploy to Celo Mainnet                  |

---

## Environment Variables Reference

| Variable                                    | Required     | Description                                                                        |
| ------------------------------------------- | ------------ | ---------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`      | Yes (prod)   | Reown project ID — [cloud.reown.com](https://cloud.reown.com)                      |
| `NEXT_PUBLIC_CHAIN_PROFILE`                 | No           | `testnet` (default) or `mainnet`                                                   |
| `NEXT_PUBLIC_APP_NAME`                      | No           | Wallet modal display name (default: Aura)                                          |
| `ANTHROPIC_API_KEY`                         | No           | Claude API key for AI Scout (heuristic fallback if unset)                          |
| `ETHERSCAN_API_KEY`                         | Recommended  | Etherscan V2 unified key — Scout wallet stats + tip history on Celo & Base mainnet |
| `ALCHEMY_API_KEY`                           | No           | Alchemy RPC key for contract deployment                                            |
| `NEXT_PUBLIC_AURA_TIP_ADDRESS_MAINNET`      | After deploy | AuraTip on Celo Mainnet                                                            |
| `NEXT_PUBLIC_AURA_TIP_ADDRESS_TESTNET`      | After deploy | AuraTip on Celo Sepolia                                                            |
| `NEXT_PUBLIC_AURA_TIP_ADDRESS_BASE_MAINNET` | After deploy | AuraTip on Base Mainnet                                                            |
| `NEXT_PUBLIC_AURA_TIP_ADDRESS_BASE_SEPOLIA` | After deploy | AuraTip on Base Sepolia                                                            |
| `NEXT_PUBLIC_USDM_ADDRESS_TESTNET`          | After deploy | MockUSDm on Celo Sepolia                                                           |
| `DEPLOYER_PRIVATE_KEY`                      | For deploy   | Deployer private key (server-only, never `NEXT_PUBLIC_`)                           |

---

## Testing

```bash
npm test
```

95 tests across 8 suites:

| Suite                   | What it tests                                                    |
| ----------------------- | ---------------------------------------------------------------- |
| `AddressInput.test.tsx` | Validation, accessibility, submit callback                       |
| `ImpactCard.test.tsx`   | All trust levels, builder badge, aura stats rendering            |
| `ShareCard.test.tsx`    | Social links, MiniPay deeplink gating, tokenSymbol prop          |
| `useAuraTip.test.ts`    | Phase transitions, approve flow, error handling                  |
| `route.test.ts`         | Scout API route — stat computation, trust heuristics, edge cases |
| `useMiniPay.test.ts`    | MiniPay detection, auto-connect logic                            |
| `filterTips.test.ts`    | Amount/category/peer filter logic                                |
| `formatTxHash.test.ts`  | Hash truncation utility                                          |

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

## Key Design Decisions

**Stateless contract.** AuraTip holds no state beyond emitting events. Reputation is derived client-side from the immutable event log — nothing can be deleted or manipulated.

**No database.** Every profile is computed on demand from chain data. There are no users, no accounts, no passwords. A wallet address is the only identity primitive.

**Two-phase Scout loading.** `/api/scout/fast` returns wallet age, last active date, tx count, and builder flag in ~1-2 s. The full `/api/scout` result (trust level, headline, stablecoin volume, Aura stats) follows in 5-12 s. `ImpactCard` upgrades in place — no re-mount, no layout shift.

**Heuristic fallback.** The AI Scout degrades gracefully. Without an Anthropic key, a deterministic algorithm computes trust level from stats. The app is fully functional either way.

**Etherscan V2 unified API.** A single `ETHERSCAN_API_KEY` covers Celo Mainnet, Base Mainnet, and Base Sepolia via Etherscan's V2 multichain endpoint (`api.etherscan.io/v2/api?chainid=…`). Blockscout is used as fallback when Etherscan is unavailable or unconfigured.

**Decimal-aware multi-token.** USDC and USDT use 6 decimals; Mento stablecoins use 18. The token registry stores decimals per token and `parseUnits(amount, token.decimals)` is called at the form layer — preventing silent precision loss.

**Post-approval re-simulation.** After the ERC-20 approve confirms on-chain, the `tip()` call is re-simulated via `publicClient.simulateContract()` with fresh RPC state. This avoids the "simulation unavailable" bug that occurs when the pre-flight simulation runs against insufficient allowance. Allowance polling (8 retries @ 1.5 s) ensures the approval is visible to the node before re-simulation.

**Stablecoin-agnostic volume.** The Scout aggregates volume across all tokens flagged `isStablecoin: true` in the registry — so adding new tokens automatically improves reputation accuracy with no Scout changes.

**MiniPay-first UX.** Auto-connect, fee abstraction, and touch-optimised layout are first-class features, not add-ons. The app is usable with zero wallet configuration inside MiniPay.

---

## License

[MIT](./LICENSE)
