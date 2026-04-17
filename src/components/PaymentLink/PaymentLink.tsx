'use client';

import { useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import styles from './PaymentLink.module.css';

interface Props {
  address: string;
}

export function PaymentLink({ address }: Props) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${address}`
      : `/${address}`;

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silent fail
    }
  }, [url]);

  return (
    <div className={styles.container}>
      <p className={styles.label}>Your payment link</p>
      <div className={styles.row}>
        <input
          className={styles.urlInput}
          type="text"
          value={url}
          readOnly
          onClick={(e) => (e.target as HTMLInputElement).select()}
          aria-label="Payment link URL"
        />
        <button
          className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
          onClick={copy}
          type="button"
          aria-label={copied ? 'Copied!' : 'Copy link'}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          className={`${styles.copyBtn} ${showQr ? styles.copied : ''}`}
          onClick={() => setShowQr((v) => !v)}
          type="button"
          aria-label={showQr ? 'Hide QR code' : 'Show QR code'}
        >
          QR
        </button>
      </div>

      {showQr && (
        <div className={styles.qrWrapper} aria-label="QR code for payment link">
          <QRCodeSVG
            value={url}
            size={180}
            bgColor="transparent"
            fgColor="#e8e8f0"
            level="M"
          />
          <p className={styles.qrCaption}>Scan to open profile</p>
        </div>
      )}
    </div>
  );
}
