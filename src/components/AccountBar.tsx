'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar } from './Avatar';
import { useLocale } from '@/lib/i18n';
import { report } from '@/lib/client-log';
import type { ReefState } from '@/lib/reef/state';
import styles from './AccountBar.module.css';

/** First two groups and last two: the ends are what people actually check. */
function truncate(address: string): string {
  const groups = address.split(' ');
  return groups.length > 4
    ? `${groups.slice(0, 2).join(' ')} … ${groups.slice(-2).join(' ')}`
    : address;
}

/**
 * The header: the app on the left, where you are in the middle, who you are on
 * the right.
 *
 * The address is not on show. It is 44 characters, it is the same every time,
 * and nobody reads it — but it is one tap away, because "which wallet is this"
 * has to be answerable.
 */
export function AccountBar({ reef, onSignOut }: { reef: ReefState; onSignOut: () => void }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // A menu that survives a click elsewhere is a menu people fight with.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(reef.address);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 1800);
    } catch (cause) {
      report('copy:address', cause);
    }
  }

  async function share() {
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Reef', text: 'My tank is filling up.', url });
        setOpen(false);
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') return;
      report('share', cause);
    }
  }

  return (
    <header className={styles.bar}>
      <span className={styles.brand}>Reef</span>
      <span className={styles.day}>{t('day', { n: reef.day })}</span>

      <div className={styles.wrap} ref={wrap}>
        <button
          className={styles.trigger}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={reef.handle}
          type="button"
        >
          <Avatar address={reef.address} size={34} />
        </button>

        {open ? (
          <div className={styles.menu} role="menu">
            {/* Truncated, because 44 characters is not something anybody
                reads — but tapping copies the whole thing, so shortening it
                does not also make it useless. */}
            <button
              className={styles.who}
              onClick={() => void copyAddress()}
              role="menuitem"
              type="button"
            >
              <code>{truncate(reef.address)}</code>
              <small>{addressCopied ? t('linkCopied') : t('copyAddress')}</small>
            </button>
            <button className={styles.item} onClick={() => void share()} role="menuitem" type="button">
              {copied ? t('linkCopied') : t('shareYours')}
            </button>
            <button
              className={styles.item}
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              role="menuitem"
              type="button"
            >
              {t('signOut')}
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
