'use client';

import { useState, useCallback } from 'react';
import styles from './SelfProfileBanner.module.css';

interface Props {
  address: string;
}

export function SelfProfileBanner({ address }: Props) {
  const [copied, setCopied] = useState(false);

  const profileUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${address}`
      : `/${address}`;

  const farcasterText = encodeURIComponent(
    `Send me a tip on Aura ✦\n${profileUrl}`,
  );
  const farcasterUrl = `https://warpcast.com/~/compose?text=${farcasterText}`;

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  }, [profileUrl]);

  return (
    <div
      className={styles.banner}
      role="complementary"
      aria-label="Your Aura profile"
    >
      <span className={styles.label}>
        <span className={styles.icon} aria-hidden>
          ✦
        </span>
        This is your Aura profile
      </span>

      <div className={styles.actions}>
        <button
          className={`${styles.btn} ${copied ? styles.btnCopied : styles.btnCopy}`}
          onClick={copy}
          type="button"
          aria-label={copied ? 'Link copied!' : 'Copy profile link'}
        >
          {copied ? '✓ Copied' : 'Copy link'}
        </button>

        <a
          className={styles.btnFarcaster}
          href={farcasterUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Farcaster"
        >
          Share
        </a>
      </div>
    </div>
  );
}
