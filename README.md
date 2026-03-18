# Web3 Boilerplate

Boilerplate de DApp listo para usar, construido con las herramientas más utilizadas en el ecosistema Web3.

## Stack

| Herramienta | Rol |
|---|---|
| [Next.js 14+](https://nextjs.org/) (App Router) | Framework frontend |
| [Wagmi v2](https://wagmi.sh/) | Hooks para interactuar con la blockchain |
| [viem v2](https://viem.sh/) | Librería de bajo nivel para Ethereum (reemplaza a ethers.js) |
| [RainbowKit](https://www.rainbowkit.com/) | UI de conexión de wallets |
| [TanStack Query](https://tanstack.com/query) | Cache y estado asíncrono (requerido por Wagmi) |

## Estructura del proyecto

```
src/
├── app/
│   ├── layout.tsx        # Root layout (proveedores, fuentes, metadata)
│   ├── page.tsx          # Home page de ejemplo
│   └── globals.css       # Estilos globales
├── components/
│   └── WalletInfo.tsx    # Ejemplo de uso de hooks de Wagmi
├── config/
│   └── wagmi.ts          # Configuración de Wagmi + RainbowKit
└── providers/
    └── Web3Provider.tsx  # Composición de proveedores Web3
```

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Completá el archivo `.env.local` con tu **WalletConnect Project ID**.
Podés obtener uno gratis en [cloud.walletconnect.com](https://cloud.walletconnect.com).

### 3. Correr el servidor de desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en el navegador.

## Agregar redes

Editá `src/config/wagmi.ts` y agregá las redes que necesites desde `wagmi/chains`:

```ts
import { mainnet, sepolia, polygon, arbitrum, base } from 'wagmi/chains';

chains: [mainnet, sepolia, polygon],
```

## Leer datos de la blockchain

Usá los hooks de Wagmi dentro de componentes `'use client'`:

```tsx
'use client';
import { useAccount, useBalance, useReadContract } from 'wagmi';
```

## Recursos

- [Documentación de Wagmi](https://wagmi.sh/react/getting-started)
- [Documentación de RainbowKit](https://www.rainbowkit.com/docs/introduction)
- [viem docs](https://viem.sh/docs/getting-started)
