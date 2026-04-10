# Web3 Boilerplate

Boilerplate de DApp listo para producción, construido con las herramientas más utilizadas en el ecosistema Web3 moderno. Incluye ejemplos funcionales de lectura y escritura en contratos ERC-20, manejo completo del ciclo de vida de transacciones, soporte multi-chain con perfiles testnet/mainnet y un sistema de configuración centralizado.

---

## Tabla de contenidos

1. [Stack tecnológico](#stack-tecnológico)
2. [Estructura del proyecto](#estructura-del-proyecto)
3. [Arquitectura general](#arquitectura-general)
4. [Setup inicial](#setup-inicial)
5. [Variables de entorno](#variables-de-entorno)
6. [Cómo funciona el sistema de providers](#cómo-funciona-el-sistema-de-providers)
7. [Cómo funciona la configuración de redes](#cómo-funciona-la-configuración-de-redes)
8. [Leer datos de la blockchain](#leer-datos-de-la-blockchain)
9. [Escribir en la blockchain](#escribir-en-la-blockchain)
10. [Ciclo de vida de una transacción](#ciclo-de-vida-de-una-transacción)
11. [Referencia de hooks](#referencia-de-hooks)
12. [Referencia de componentes](#referencia-de-componentes)
13. [Agregar redes](#agregar-redes)
14. [Agregar contratos](#agregar-contratos)
15. [Smart Contracts (Solidity)](#smart-contracts-solidity)
16. [Testing](#testing)
17. [CI/CD](#cicd)
18. [Scripts disponibles](#scripts-disponibles)
19. [Recursos](#recursos)

---

## Stack tecnológico

| Herramienta                                                      | Versión | Rol                                                   |
| ---------------------------------------------------------------- | ------- | ----------------------------------------------------- |
| [Next.js](https://nextjs.org/) (App Router)                      | 16      | Framework React con SSR/SSG                           |
| [React](https://react.dev/)                                      | 19      | UI y estado de componentes                            |
| [TypeScript](https://www.typescriptlang.org/)                    | 5.9     | Tipado estático estricto                              |
| [Wagmi](https://wagmi.sh/)                                       | v2      | Hooks React para interacción con blockchain           |
| [viem](https://viem.sh/)                                         | v2      | Librería Ethereum de bajo nivel (reemplaza ethers.js) |
| [RainbowKit](https://www.rainbowkit.com/)                        | v2      | UI de conexión de wallets multi-proveedor             |
| [TanStack Query](https://tanstack.com/query)                     | v5      | Cache y estado asíncrono (requerido por Wagmi)        |
| [Vitest](https://vitest.dev/)                                    | v4      | Runner de tests unitarios                             |
| [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) | v9 / v3 | Linting y formateo                                    |
| [Husky](https://typicode.github.io/husky/) + lint-staged         | v9      | Validación en pre-commit                              |

---

## Estructura del proyecto

```
aleph2026/
├── contracts/                        # Smart contracts en Solidity (ver contracts/README.md)
├── src/
│   ├── abi/
│   │   └── erc20.ts                  # ABI ERC-20: lectura (name, symbol, decimals,
│   │                                 #   totalSupply, balanceOf, allowance) y
│   │                                 #   escritura (transfer, approve)
│   │
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout: proveedores Web3, fuentes, metadata
│   │   ├── page.tsx                  # Home: ConnectButton + demos de lectura y escritura
│   │   ├── error.tsx                 # Error boundary global (errores en runtime)
│   │   ├── not-found.tsx             # Página 404
│   │   ├── loading.tsx               # Loading state global (Suspense)
│   │   └── globals.css               # Reset, variables CSS (colores, fuentes) y keyframes
│   │
│   ├── components/
│   │   ├── WalletInfo.tsx            # Muestra dirección, red y balance (useAccount, useBalance)
│   │   ├── WalletInfo.module.css
│   │   ├── WalletInfo.test.tsx
│   │   ├── TokenInfo.tsx             # Lee metadata de token ERC-20 (useReadContract) — DEMO
│   │   ├── TokenInfo.module.css
│   │   ├── TokenInfo.test.tsx
│   │   ├── TransferForm.tsx          # Formulario de transferencia ERC-20 — DEMO escritura
│   │   ├── TransferForm.module.css
│   │   ├── TransferForm.test.tsx
│   │   ├── TxStatus.tsx              # Muestra el estado de una tx (pending/confirming/success/error)
│   │   ├── TxStatus.module.css
│   │   └── TxStatus.test.tsx
│   │
│   ├── config/
│   │   ├── chain-definitions.ts      # Define testnetChains y mainnetChains (wagmi/chains)
│   │   ├── chains.ts                 # Exporta supportedChains según env + re-exporta explorers
│   │   ├── contracts.ts              # Registro de direcciones de contratos por chainId y perfil
│   │   ├── env.ts                    # Validación y resolución de variables de entorno
│   │   ├── explorer.ts               # Helpers: getExplorerTxUrl, getExplorerAddressUrl
│   │   ├── rpc.ts                    # Transports HTTP por chain (Infura con fallback a RPC público)
│   │   ├── theme.ts                  # Tema custom de RainbowKit (light + dark)
│   │   └── wagmi.ts                  # Config de RainbowKit + Wagmi (chains + transports + appName)
│   │
│   ├── hooks/
│   │   ├── useErc20Transfer.ts       # Hook: ciclo completo de transferencia ERC-20
│   │   └── useErc20Transfer.test.ts
│   │
│   └── providers/
│       ├── ClientWeb3Provider.tsx    # Dynamic import con ssr: false (evita hidratación)
│       └── Web3Provider.tsx          # Composición: WagmiProvider + QueryClientProvider + RainbowKit
│
├── .github/workflows/ci.yml          # Pipeline CI: format → lint → typecheck → test → build
├── .env.local.example                # Template de variables de entorno
├── vitest.config.ts                  # Config de Vitest (jsdom, alias @/*)
├── vitest.setup.ts                   # Setup global de tests
└── LICENSE                           # MIT
```

---

## Arquitectura general

### Flujo de inicialización

```
layout.tsx
  └── ClientWeb3Provider          ← cargado con dynamic import (ssr: false)
        └── Web3Provider
              ├── WagmiProvider   ← config de wagmi.ts (chains + transports + projectId)
              ├── QueryClientProvider  ← TanStack Query (requerido por Wagmi)
              └── RainbowKitProvider  ← tema custom desde config/theme.ts
                    └── {children}   ← todas las páginas
```

El `ssr: false` en `ClientWeb3Provider` es crítico: evita errores de hidratación causados por que el estado de la wallet existe solo en el navegador (no en el servidor).

### Flujo de configuración de redes

```
.env.local
  NEXT_PUBLIC_CHAIN_PROFILE=testnet
        │
        ▼
src/config/env.ts          → resuelve y valida variables de entorno
        │
        ▼
src/config/chain-definitions.ts  → define testnetChains / mainnetChains
        │
        ▼
src/config/chains.ts       → exporta supportedChains (la lista activa)
        │
        ├── src/config/rpc.ts    → construye transports HTTP por chain
        ├── src/config/wagmi.ts  → config final de Wagmi + RainbowKit
        └── src/config/contracts.ts → resuelve dirección de contrato por chainId
```

### Flujo de una transacción de escritura

```
Usuario llena el formulario
        │
        ▼
useSimulateContract         ← 1. Simula la tx: detecta reverts antes de pedir firma
        │
        ▼ (si la simulación es exitosa)
useWriteContract.execute()  ← 2. Abre el modal de la wallet para firmar
        │
        ▼ (si el usuario firma)
useWaitForTransactionReceipt  ← 3. Polling hasta que la tx es incluida en un bloque
        │
        ├── status: 'pending'    → usuario firmando en wallet
        ├── status: 'confirming' → tx enviada, esperando bloque
        ├── status: 'success'    → tx incluida y exitosa
        └── status: 'error'      → rechazo, revert en cadena, error de red
```

---

## Setup inicial

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd aleph2026
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Editá `.env.local` con tus valores (ver la sección [Variables de entorno](#variables-de-entorno) más abajo).

### 3. Correr el servidor de desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). Con la wallet de tu navegador (MetaMask, Coinbase Wallet, etc.) podés conectarte a las testnets configuradas y ver los ejemplos en acción.

### 4. Verificar que todo funciona

```bash
npm run typecheck   # sin errores de tipos
npm test            # todos los tests en verde
npm run build       # build de producción exitoso
```

---

## Variables de entorno

Todas las variables con prefijo `NEXT_PUBLIC_` son **expuestas al navegador** y visibles en el bundle del cliente. No uses este prefijo para secretos de servidor.

| Variable                               | Obligatoria         | Default             | Descripción                                                                                                                                                                                                |
| -------------------------------------- | ------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | En build/producción | Placeholder en dev  | ID de proyecto de Reown (ex WalletConnect). Obtené uno gratis en [cloud.reown.com](https://cloud.reown.com). Sin él, MetaMask y extensiones de navegador funcionan; WalletConnect QR (móvil) puede fallar. |
| `NEXT_PUBLIC_APP_NAME`                 | No                  | `My Web3 App`       | Nombre que aparece en el modal de la wallet al conectar.                                                                                                                                                   |
| `NEXT_PUBLIC_CHAIN_PROFILE`            | No                  | `testnet`           | Controla qué redes expone la DApp. `testnet` activa Sepolia + Base Sepolia + Avalanche Fuji. `mainnet` activa Ethereum + Base + Avalanche.                                                                 |
| `NEXT_PUBLIC_INFURA_API_KEY`           | No                  | — (usa RPC público) | API key de [Infura](https://app.infura.io). Sin ella la app usa RPCs públicos, suficiente para desarrollo. Para producción, un RPC privado mejora velocidad, rate limits y uptime.                         |

### Comportamiento en desarrollo vs producción

- **`npm run dev` sin `.env.local`**: arranca con un placeholder para WalletConnect. Las wallets de extensión de navegador funcionan normalmente.
- **`npm run build` sin `WALLETCONNECT_PROJECT_ID`**: falla en build. El ID es obligatorio para producción.
- **`NEXT_PUBLIC_CHAIN_PROFILE`**: usar `testnet` en Preview/Staging, `mainnet` solo en producción verificada.

### Dónde se validan las variables

`src/config/env.ts` es la única fuente de verdad para leer y validar variables de entorno. Los componentes y hooks **nunca** acceden a `process.env` directamente; siempre importan desde `env`:

```ts
import { env } from '@/config/env';

env.walletConnectProjectId; // string validado
env.chainProfile; // 'testnet' | 'mainnet'
env.infuraApiKey; // string | undefined
env.appName; // string con fallback
```

---

## Cómo funciona el sistema de providers

### `src/providers/Web3Provider.tsx`

Compone el árbol de proveedores necesario para que Wagmi y RainbowKit funcionen:

```tsx
<WagmiProvider config={config}>          // config desde src/config/wagmi.ts
  <QueryClientProvider client={...}>     // TanStack Query (requerido por Wagmi)
    <RainbowKitProvider theme={...}>     // tema desde src/config/theme.ts
      {children}
    </RainbowKitProvider>
  </QueryClientProvider>
</WagmiProvider>
```

### `src/providers/ClientWeb3Provider.tsx`

Envuelve `Web3Provider` con `dynamic(() => ..., { ssr: false })` para que todo el árbol de providers se cargue solo en el cliente. Esto evita errores de hidratación porque el estado de la wallet (address, chainId) no existe en el servidor.

### `src/config/wagmi.ts`

Construye la configuración final que recibe `WagmiProvider`:

```ts
const config = getDefaultConfig({
  appName: env.appName,
  projectId: env.walletConnectProjectId,
  chains: supportedChains, // desde chain-definitions.ts según env
  transports: buildTransportsForChains(supportedChains, env.infuraApiKey),
  ssr: true,
});
```

`buildTransportsForChains` en `src/config/rpc.ts` construye un `http()` transport por chain: si hay una Infura API key lo usa; si no, cae a RPC público.

---

## Cómo funciona la configuración de redes

### Perfiles de red

En `src/config/chain-definitions.ts` se definen dos grupos de redes:

```ts
export const testnetChains = [sepolia, baseSepolia, avalancheFuji] as const;
export const mainnetChains = [mainnet, base, avalanche] as const;
```

`NEXT_PUBLIC_CHAIN_PROFILE` en `.env.local` decide cuál grupo se activa. `src/config/chains.ts` exporta `supportedChains`, que es el arreglo activo según ese valor.

### Registro de contratos

`src/config/contracts.ts` centraliza todas las direcciones de contratos en un único lugar, separadas por perfil:

```ts
const USDC_TESTNET: Partial<Record<number, Address>> = {
  11155111: '0x1c7D...', // Sepolia
  84532: '0x036C...', // Base Sepolia
  43113: '0x5425...', // Avalanche Fuji
};

// Obtener la dirección para el chain actual:
const address = getUsdcAddress(chain.id); // undefined si no está soportado
```

Los componentes **nunca** hardcodean direcciones; siempre las resuelven desde `contracts.ts` usando el `chainId` actual de la wallet conectada.

---

## Leer datos de la blockchain

Usá `useReadContract` de Wagmi dentro de componentes `'use client'`. El componente `TokenInfo.tsx` demuestra el patrón completo:

```tsx
'use client';
import { useReadContract, useAccount } from 'wagmi';
import { erc20Abi } from '@/abi/erc20';
import { getUsdcAddress } from '@/config/contracts';

export function TokenInfo() {
  const { isConnected, chain } = useAccount();
  const contractAddress =
    chain?.id !== undefined ? getUsdcAddress(chain.id) : undefined;

  const { data: name, isLoading } = useReadContract({
    address: contractAddress,
    abi: erc20Abi,
    functionName: 'name',
    // El hook solo corre cuando hay wallet conectada y chain soportado
    query: { enabled: isConnected && !!contractAddress },
  });
}
```

### ABI y tipos

Los ABIs viven en `src/abi/` y se exportan con `as const`. El `as const` es fundamental: permite que Wagmi y TypeScript infieran automáticamente los tipos de los argumentos y valores de retorno de cada función.

El `erc20Abi` incluye funciones de **lectura** (`name`, `symbol`, `decimals`, `totalSupply`, `balanceOf`, `allowance`) y de **escritura** (`transfer`, `approve`).

Para usar tu propio contrato: creá un archivo `src/abi/miContrato.ts` y exportá el ABI con `as const` con el mismo formato.

---

## Escribir en la blockchain

El patrón recomendado por Wagmi v2 para escritura tiene tres pasos encadenados. El hook `useErc20Transfer` los encapsula.

### El patrón de escritura (wagmi v2)

```ts
// Paso 1 — Simular: detecta si el contrato va a revertir ANTES de pedir firma
const { data: simulateData, error: simulateError } = useSimulateContract({
  address: contractAddress,
  abi: erc20Abi,
  functionName: 'transfer',
  args: [to, amount],
  query: { enabled: isReady }, // solo corre cuando los args son válidos
});

// Paso 2 — Escribir: abre el modal de la wallet para que el usuario firme
const {
  writeContract,
  data: txHash,
  isPending,
  error: writeError,
} = useWriteContract();

// Usar el request pre-simulado (más seguro que construir el request manualmente)
const execute = () => writeContract(simulateData.request);

// Paso 3 — Esperar confirmación: polling hasta que la tx es incluida en un bloque
const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
  hash: txHash,
});
```

**¿Por qué simular primero?** La simulación llama al nodo RPC sin enviar nada a la red. Si el contrato va a revertir (saldo insuficiente, falta de allowance, etc.), lo sabés _antes_ de que el usuario vea el modal de la wallet y pague gas. Esto mejora significativamente la UX.

**¿Por qué usar `simulateData.request`?** El objeto `request` que devuelve la simulación incluye los parámetros exactos validados por el nodo (gas estimado, calldata codificado). Pasarlo directamente a `writeContract` es más robusto que repasar los args manualmente.

### El componente `TransferForm`

`TransferForm.tsx` es el ejemplo completo de escritura. Su flujo interno:

1. Lee `decimals` del contrato con `useReadContract` (necesario para `parseUnits`).
2. Valida los inputs del formulario en el cliente (`isAddress` de viem, `parseFloat > 0`).
3. Delega toda la lógica de tx al hook `useErc20Transfer`.
4. Deshabilita el botón de envío mientras `canExecute` es `false` (simulación pendiente o fallida, tx en curso).
5. Muestra el componente `TxStatus` para el feedback visual del estado.
6. Al confirmar la tx, oculta el formulario y muestra un botón "Nueva transferencia" que llama a `reset()`.

---

## Ciclo de vida de una transacción

El hook `useErc20Transfer` expone un `status` unificado que describe en qué punto del ciclo está la transacción:

| Status       | Descripción                  | Cuándo ocurre                                                                       |
| ------------ | ---------------------------- | ----------------------------------------------------------------------------------- |
| `idle`       | Sin transacción activa       | Estado inicial o tras un reset                                                      |
| `pending`    | Esperando firma del usuario  | Desde que se llama a `execute()` hasta que el usuario acepta o rechaza en la wallet |
| `confirming` | Tx firmada, esperando bloque | Desde que la tx es enviada a la red hasta que es incluida en un bloque              |
| `success`    | Tx confirmada y exitosa      | Cuando `receipt.status === 'success'`                                               |
| `error`      | Algo falló                   | Rechazo del usuario, revert en cadena, error de red                                 |

El hook diferencia dos tipos de error:

- **`simulateError`**: el contrato revertirá con los argumentos actuales (saldo insuficiente, etc.). La tx aún **no fue enviada**. Se muestra inline en el formulario para que el usuario corrija antes de intentar.
- **`error`**: falló la firma (`writeError`), hubo un error esperando el receipt (`receiptError`), o la tx fue incluida en la cadena pero revertida (`receipt.status === 'reverted'`).

El componente `TxStatus` los muestra de forma diferenciada: `simulateError` aparece dentro del formulario antes del botón de envío; `error` aparece en el bloque de status (abajo del formulario, junto al hash si ya fue enviada).

---

## Referencia de hooks

### `useErc20Transfer`

`src/hooks/useErc20Transfer.ts`

Encapsula el flujo completo `simulate → write → waitForReceipt` para una transferencia ERC-20.

```ts
import { useErc20Transfer } from '@/hooks/useErc20Transfer';

const {
  execute, // () => void — envía la tx con el request simulado
  status, // TxStatus: 'idle' | 'pending' | 'confirming' | 'success' | 'error'
  txHash, // `0x${string}` | undefined — disponible desde que se firma
  error, // Error | null — error de firma o de confirmación
  simulateError, // Error | null — error de simulación (antes de enviar)
  reset, // () => void — limpia el estado de la tx para un nuevo intento
  canExecute, // boolean — true cuando simulación exitosa y tx no activa
} = useErc20Transfer({
  contractAddress, // Address | undefined
  decimals, // number | undefined — para parseUnits
  to, // Address | undefined — dirección destino
  amount, // string — monto en unidades humanas, p. ej. '10.5'
});
```

**Para adaptar a otro contrato:**

1. Copiá el hook y renombralo (p. ej. `useMyContractWrite.ts`).
2. Cambiá el `abi`, `functionName` y `args` en `useSimulateContract` y `useWriteContract`.
3. Actualizá los tipos de entrada según los argumentos de tu función.

---

## Referencia de componentes

### `WalletInfo`

Muestra el estado de la wallet conectada: dirección, nombre de la red y balance nativo.

Hooks usados: `useAccount`, `useBalance`.

Renderiza `null` si no hay wallet conectada — no necesitás condicionarlo en el padre.

### `TokenInfo`

Demo de lectura de contrato ERC-20. Lee `name`, `symbol`, `decimals` y la dirección del contrato USDC en la red activa.

Hooks usados: `useReadContract` (×3), `useAccount`.

Si la red no está soportada (no hay dirección en `contracts.ts`), muestra un hint para que el usuario cambie de red.

### `TransferForm`

Demo completo de escritura en contrato ERC-20. Formulario con validación de dirección y monto, simulación previa, y feedback visual del ciclo de vida de la tx.

Hooks usados: `useErc20Transfer` (custom), `useReadContract` (para decimals), `useAccount`.

Muestra `null` si no hay wallet conectada. Si la red no está soportada, muestra un hint.

### `TxStatus`

Componente presentacional y reutilizable. Muestra el estado de cualquier transacción con mensaje descriptivo y enlace al explorador de bloques.

```tsx
<TxStatus
  status={status} // TxStatus
  txHash={txHash} // `0x${string}` | undefined
  chain={chain} // Chain | undefined — para construir el link al explorador
  error={error} // Error | null — muestra el mensaje solo en status='error'
/>
```

- Renderiza `null` cuando `status === 'idle'`.
- Incluye atributos `role="status"` y `aria-live="polite"` para lectores de pantalla.
- Cuando `error` es un error de viem, usa `shortMessage` (mensaje legible) en lugar del mensaje técnico completo.

---

## Agregar redes

### 1. Registrar la chain

En `src/config/chain-definitions.ts`, importá la chain desde `wagmi/chains` y agregala al arreglo correspondiente:

```ts
import { polygon, polygonAmoy } from 'wagmi/chains';

export const testnetChains = [
  sepolia,
  baseSepolia,
  avalancheFuji,
  polygonAmoy,
] as const;
export const mainnetChains = [mainnet, base, avalanche, polygon] as const;
```

### 2. Agregar el RPC transport

En `src/config/rpc.ts`, registrá la URL de Infura (u otro proveedor) para la nueva chain:

```ts
import { polygon, polygonAmoy } from 'wagmi/chains';

const infuraHttpUrlByChainId = {
  // ... existentes ...
  [polygon.id]: (k) => `https://polygon-mainnet.infura.io/v3/${k}`,
  [polygonAmoy.id]: (k) => `https://polygon-amoy.infura.io/v3/${k}`,
};
```

Si no tenés RPC privado para esa chain, no es necesario agregar nada: `buildTransportsForChains` usará el RPC público por defecto.

### 3. Registrar las direcciones de contratos

En `src/config/contracts.ts`, agregá las direcciones para la nueva chain:

```ts
const USDC_TESTNET: Partial<Record<number, Address>> = {
  // ... existentes ...
  80002: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // Polygon Amoy
};
```

---

## Agregar contratos

### 1. Creá el ABI

```ts
// src/abi/miContrato.ts
export const miContratoAbi = [
  {
    type: 'function',
    name: 'miLectura',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'miEscritura',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'valor', type: 'uint256' }],
    outputs: [],
  },
] as const; // ← el `as const` es obligatorio para inferencia de tipos en Wagmi
```

### 2. Registrá las direcciones

En `src/config/contracts.ts`, agregá las direcciones por chainId siguiendo el mismo patrón que USDC.

### 3. Usá el contrato en un componente

**Para lectura:**

```tsx
const { data } = useReadContract({
  address: getContractAddress(chain.id),
  abi: miContratoAbi,
  functionName: 'miLectura',
  query: { enabled: isConnected && !!contractAddress },
});
```

**Para escritura:** copiá y adaptá `src/hooks/useErc20Transfer.ts`.

---

## Smart Contracts (Solidity)

La carpeta `contracts/` está reservada para tus contratos. El boilerplate no preinstala Hardhat ni Foundry — elegís vos la toolchain.

Consultá **[contracts/README.md](./contracts/README.md)** para instrucciones paso a paso de configuración con Hardhat, Foundry o Remix, compilación, generación de ABIs y scripts de deploy.

**Flujo recomendado:**

1. Escribí y compilá tu contrato en `contracts/`.
2. Copiá el ABI generado a `src/abi/miContrato.ts` (con `as const`).
3. Registrá la dirección desplegada en `src/config/contracts.ts`.
4. Usá el ABI en tus componentes o hooks.

---

## Testing

El proyecto usa **Vitest** con `@testing-library/react` y `jsdom`. Todos los tests siguen el mismo patrón: mock de hooks de Wagmi con `vi.mock`, montaje con `render`/`renderHook`, y verificación con `@testing-library/jest-dom`.

### Estructura de tests

| Archivo                                | Qué testea                                                          |
| -------------------------------------- | ------------------------------------------------------------------- |
| `src/config/env.test.ts`               | Validación de variables de entorno (missing, trim, defaults)        |
| `src/config/chains.test.ts`            | Helpers de URLs de explorador por chain                             |
| `src/config/contracts.test.ts`         | Resolución de direcciones por chainId y perfil                      |
| `src/components/WalletInfo.test.tsx`   | Estados: desconectado, conectado con balance, cargando balance      |
| `src/components/TokenInfo.test.tsx`    | Estados: desconectado, red no soportada, datos del token            |
| `src/components/TxStatus.test.tsx`     | Todos los status, ARIA, error detail, explorer link                 |
| `src/components/TransferForm.test.tsx` | Desconectado, red no soportada, validación, estados de envío, reset |
| `src/hooks/useErc20Transfer.test.ts`   | Ciclo de vida: status, simulateError, canExecute, execute, txHash   |

### Patrón de mock de Wagmi

```ts
vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useReadContract: vi.fn(),
}));

import { useAccount, useReadContract } from 'wagmi';

const mockUseAccount = vi.mocked(useAccount);

mockUseAccount.mockReturnValue({
  isConnected: true,
  address: '0x123...',
  chain: { id: 11155111, name: 'Ethereum Sepolia' },
} as unknown as ReturnType<typeof useAccount>);
```

El `as unknown as ReturnType<...>` evita tener que implementar la totalidad del tipo de retorno de wagmi (que incluye muchas propiedades internas).

### Correr los tests

```bash
npm test                 # ejecución única
npm run test:watch       # modo watch (re-corre al guardar)
npm run test:coverage    # con reporte de cobertura
```

---

## CI/CD

El workflow `.github/workflows/ci.yml` se ejecuta en cada push a `main` y en pull requests. Los pasos se ejecutan en orden y el pipeline falla completo si cualquier paso falla:

```
1. format:check   → prettier --check .
2. lint           → eslint
3. typecheck      → tsc --noEmit
4. test           → vitest run
5. build          → next build
```

El pipeline configura las variables de entorno mínimas necesarias para que el build no falle:

```yaml
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: ci-placeholder
NEXT_PUBLIC_CHAIN_PROFILE: testnet
```

### Pre-commit local (Husky + lint-staged)

Antes de cada commit, se ejecuta automáticamente:

- **ESLint** con `--fix` sobre archivos `.ts` y `.tsx` modificados.
- **Prettier** sobre archivos `.ts`, `.tsx`, `.css`, `.json` y `.md` modificados.

Esto garantiza que ningún commit rompa el formato o las reglas de lint, complementando el CI remoto.

---

## Scripts disponibles

| Comando                 | Descripción                                         |
| ----------------------- | --------------------------------------------------- |
| `npm run dev`           | Servidor de desarrollo con hot reload               |
| `npm run build`         | Build de producción (falla si hay errores de tipos) |
| `npm run start`         | Servidor de producción (requiere `build` previo)    |
| `npm run lint`          | Linter ESLint (sin autofix)                         |
| `npm run typecheck`     | Verificación de tipos TypeScript (`tsc --noEmit`)   |
| `npm run format`        | Formatear todo el código con Prettier               |
| `npm run format:check`  | Verificar formato sin modificar archivos            |
| `npm test`              | Ejecutar todos los tests (Vitest, ejecución única)  |
| `npm run test:watch`    | Tests en modo watch                                 |
| `npm run test:coverage` | Tests con reporte de cobertura de código            |

---

## Recursos

- [Wagmi — Getting Started](https://wagmi.sh/react/getting-started)
- [Wagmi — useReadContract](https://wagmi.sh/react/api/hooks/useReadContract)
- [Wagmi — useWriteContract](https://wagmi.sh/react/api/hooks/useWriteContract)
- [Wagmi — useSimulateContract](https://wagmi.sh/react/api/hooks/useSimulateContract)
- [Wagmi — useWaitForTransactionReceipt](https://wagmi.sh/react/api/hooks/useWaitForTransactionReceipt)
- [viem — Getting Started](https://viem.sh/docs/getting-started)
- [RainbowKit — Introduction](https://www.rainbowkit.com/docs/introduction)
- [TanStack Query](https://tanstack.com/query/latest)
- [Hardhat Docs](https://hardhat.org/docs)
- [Foundry Book](https://book.getfoundry.sh/)

---

## Licencia

[MIT](./LICENSE)
