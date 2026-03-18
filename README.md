# Web3 Boilerplate

Boilerplate de DApp listo para usar, construido con las herramientas más utilizadas en el ecosistema Web3.

## Stack

| Herramienta                                    | Rol                                                          |
| ---------------------------------------------- | ------------------------------------------------------------ |
| [Next.js 16](https://nextjs.org/) (App Router) | Framework frontend                                           |
| [Wagmi v2](https://wagmi.sh/)                  | Hooks para interactuar con la blockchain                     |
| [viem v2](https://viem.sh/)                    | Librería de bajo nivel para Ethereum (reemplaza a ethers.js) |
| [RainbowKit](https://www.rainbowkit.com/)      | UI de conexión de wallets                                    |
| [TanStack Query](https://tanstack.com/query)   | Cache y estado asíncrono (requerido por Wagmi)               |

## Estructura del proyecto

```
src/
├── app/
│   ├── layout.tsx              # Root layout (proveedores, fuentes, metadata)
│   ├── page.tsx                # Home page de ejemplo
│   ├── page.module.css         # Estilos de la home page
│   ├── error.tsx               # Error boundary global
│   ├── error.module.css        # Estilos de error y 404
│   ├── not-found.tsx           # Página 404
│   ├── loading.tsx             # Loading state global
│   ├── loading.module.css      # Estilos del loading spinner
│   └── globals.css             # Reset, variables CSS y estilos globales
├── components/
│   ├── WalletInfo.tsx          # Ejemplo de uso de hooks de Wagmi
│   └── WalletInfo.module.css   # Estilos del componente WalletInfo
├── config/
│   ├── env.ts                  # Validación de variables de entorno
│   └── wagmi.ts                # Configuración de Wagmi + RainbowKit
└── providers/
    ├── ClientWeb3Provider.tsx   # Wrapper dinámico (ssr: false)
    └── Web3Provider.tsx         # Composición de proveedores Web3
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

## Scripts disponibles

| Comando                 | Descripción                     |
| ----------------------- | ------------------------------- |
| `npm run dev`           | Servidor de desarrollo          |
| `npm run build`         | Build de producción             |
| `npm run start`         | Servidor de producción          |
| `npm run lint`          | Linter (ESLint)                 |
| `npm run format`        | Formatear código (Prettier)     |
| `npm run format:check`  | Verificar formato sin modificar |
| `npm test`              | Ejecutar tests (Vitest)         |
| `npm run test:watch`    | Tests en modo watch             |
| `npm run test:coverage` | Tests con reporte de cobertura  |

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
