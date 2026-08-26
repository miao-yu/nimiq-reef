'use client';

import { useState } from 'react';
import { Avatar } from './Avatar';
import { ShareButton } from './ShareButton';
import { useLocale } from '@/lib/i18n';
import type { ReefState } from '@/lib/reef/state';
import styles from './AccountBar.module.css';

/**
 * Who you are, at the top where identity belongs.
 *
 * Collapsed by default: a 44-character address at the head of every screen is
 * noise, and the handle is what a reef is called anyway. Tapping opens the full
 * address and the controls, so the answer to "which wallet is this" is one tap
 * away rather than absent — the failure the footer version had.
 */
export function AccountBar({
  reef,
  onSignOut,
}: {
  reef: ReefState;
  onSignOut: () => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.bar}>
      <button
        className={styles.identity}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        type="button"
      >
        <Avatar address={reef.address} size={38} />
        <span className={styles.names}>
          <b>{reef.handle}</b>
          <small>{open ? t('day', { n: reef.day }) : truncate(reef.address)}</small>
        </span>
        <span className={styles.chevron} aria-hidden="true">
          {open ? '⌃' : '⌄'}
        </span>
      </button>

      {open ? (
        <div className={styles.details}>
          <code className={styles.address}>{reef.address}</code>
          <div className={styles.actions}>
            <ShareButton label={t('shareYours')} />
            <button className={styles.ghost} onClick={onSignOut} type="button">
              {t('signOut')}
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

/** Nimiq addresses are 44 characters. Keep the ends, which is what people check. */
function truncate(address: string): string {
  const groups = address.split(' ');
  return groups.length > 4
    ? `${groups.slice(0, 2).join(' ')} … ${groups.slice(-2).join(' ')}`
    : address;
}
