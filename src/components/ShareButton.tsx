'use client';

import { useState } from 'react';
import { report } from '@/lib/client-log';
import { useLocale } from '@/lib/i18n';
import styles from './ShareButton.module.css';

/**
 * Share the grove.
 *
 * Shares the page URL rather than the image file: a link unfurls into the card
 * via OpenGraph and stays live, so the picture keeps growing after it is
 * posted. A downloaded PNG would freeze on the day it was taken.
 */
export function ShareButton({ label }: { label?: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Nimiq Grove', text: 'My grove is growing.', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (cause) {
      // A cancelled share sheet rejects; that is not an error worth reporting.
      if (cause instanceof Error && cause.name === 'AbortError') return;
      report('share', cause);
    }
  }

  return (
    <button className={styles.button} onClick={() => void share()} type="button">
      {copied ? t('linkCopied') : (label ?? t('shareYours'))}
    </button>
  );
}
