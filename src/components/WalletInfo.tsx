'use client';

import { useAccount, useBalance } from 'wagmi';

export function WalletInfo() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });

  if (!isConnected) {
    return (
      <p className="wallet-status disconnected">
        Ninguna wallet conectada. Hacé clic en &quot;Connect Wallet&quot; para empezar.
      </p>
    );
  }

  return (
    <div className="wallet-info">
      <h2>Wallet conectada</h2>
      <ul>
        <li>
          <span className="label">Dirección:</span>
          <span className="value mono">{address}</span>
        </li>
        <li>
          <span className="label">Red:</span>
          <span className="value">{chain?.name ?? 'Desconocida'}</span>
        </li>
        <li>
          <span className="label">Balance:</span>
          <span className="value">
            {balance
              ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}`
              : 'Cargando...'}
          </span>
        </li>
      </ul>
    </div>
  );
}
