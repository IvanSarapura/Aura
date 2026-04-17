import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Wagmi/RainbowKit leen `env` al importar `contracts` / `chains`. Sin esto,
// los tests fallan si no existe `.env.local` con NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.
if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim()) {
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID =
    'vitest-walletconnect-placeholder';
}

// @testing-library/react does not auto-cleanup in vitest without this.
afterEach(cleanup);
