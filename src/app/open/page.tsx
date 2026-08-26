'use client';

import { useState } from 'react';
import styles from './page.module.css';

/**
 * Getting Reef into Nimiq Pay while it is not in the directory.
 *
 * The nimpay.app HTTPS opener is a server-side allowlist and 404s for unlisted
 * apps. The `nimiqpay://` scheme is handled by the app itself and warns rather
 * than blocking, so a plain tappable link is the shortest route onto a device.
 */
const APP_URL = 'https://reef.nimiq.cafe';
const DEEPLINK = `nimiqpay://miniapp?url=${encodeURIComponent(APP_URL)}`;

export default function OpenInNimiqPay() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(APP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className={styles.wrap}>
      <div className={styles.step}>
        <h1 className={styles.title}>Open Reef in Nimiq Pay</h1>
        <p className={styles.sub}>Open this page on the phone that has Nimiq Pay installed.</p>
      </div>

      <a className={styles.cta} href={DEEPLINK}>
        Open in Nimiq Pay
      </a>
      <p className={styles.sub}>
        Nimiq Pay will warn that this app is not in its directory. That is expected while it is
        unlisted — continue past it.
      </p>

      <div className={styles.divider}>or paste it manually</div>

      <div className={styles.step}>
        <h2>Mini Apps → Custom URL</h2>
        <p>
          If you cannot see that field, open the app menu and hold the settings button for about ten
          seconds to reveal the developer menu, then look again.
        </p>
        <div className={styles.urlbox}>{APP_URL}</div>
        <button className={styles.copy} onClick={() => void copy()} type="button">
          {copied ? 'Copied' : 'Copy URL'}
        </button>
      </div>
    </main>
  );
}
