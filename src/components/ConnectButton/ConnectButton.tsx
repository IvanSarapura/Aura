'use client';

import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { celo, celoSepolia } from 'viem/chains';
import styles from './ConnectButton.module.css';

export function ConnectButton() {
  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const connected = mounted && account && chain;
        const chainLabel =
          chain?.id === celoSepolia.id ? 'Celo Sepolia' : (chain?.name ?? '');

        return (
          <div
            className={styles.wrapper}
            {...(!mounted && {
              'aria-hidden': true,
              style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
            })}
          >
            {!connected ? (
              <button
                className={styles.connectBtn}
                onClick={openConnectModal}
                type="button"
              >
                Connect wallet
              </button>
            ) : chain.unsupported ? (
              <button
                className={`${styles.connectBtn} ${styles.wrong}`}
                onClick={openChainModal}
                type="button"
              >
                Wrong network
              </button>
            ) : (
              <div className={styles.accountRow}>
                <button
                  className={`${styles.chainBtn} ${chain.id === celo.id ? styles.chainBtnMainnet : styles.chainBtnTestnet}`}
                  onClick={openChainModal}
                  type="button"
                  title="Switch network"
                >
                  <span
                    className={`${styles.networkDot} ${chain.id === celo.id ? styles.networkDotMainnet : styles.networkDotTestnet}`}
                    aria-hidden="true"
                  />
                  {chain.hasIcon && chain.iconUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- RainbowKit chain icons have unpredictable domains; next/image requires allowlisting
                    <img
                      src={chain.iconUrl}
                      alt={chain.name}
                      className={styles.chainIcon}
                    />
                  )}
                  {chainLabel}
                </button>
                <button
                  className={styles.accountBtn}
                  onClick={openAccountModal}
                  type="button"
                >
                  {account.displayName}
                </button>
              </div>
            )}
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}
