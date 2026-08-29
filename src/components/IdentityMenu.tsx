'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar } from './Avatar';
import { useLocale } from '@/lib/i18n';
import { report } from '@/lib/client-log';
import { truncateAddress } from '@/lib/nimiq/address';
import styles from './IdentityMenu.module.css';

/**
 * Whose reef this is, and the few things you can do about it.
 *
 * Extracted from the header so somebody else's reef can wear the same control
 * as your own. The two differ only in what belongs on the menu: on your reef
 * you can sign out, on a reef you are visiting there is nothing to sign out
 * of — so `onSignOut` is optional and its absence removes the item rather
 * than showing one that would be wrong.
 *
 * The address is never on show. It is 44 characters, it is the same every
 * time, and nobody reads it — but it is one tap away, because "whose reef is
 * this" has to be answerable.
 */
export function IdentityMenu({
  address,
  shareUrl,
  shareLabel,
  onSignOut,
  size = 34,
}: {
  address: string;
  /** What the share item hands over. Defaults to wherever the viewer is. */
  shareUrl?: string;
  shareLabel: string;
  onSignOut?: () => void;
  size?: number;
}) {
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
      await navigator.clipboard.writeText(address);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 1800);
    } catch (cause) {
      report('copy:address', cause);
    }
  }

  async function share() {
    const url = shareUrl ?? window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Reef', text: shareLabel, url });
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
    <div className={styles.wrap} ref={wrap}>
      <button
        className={styles.trigger}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={truncateAddress(address)}
        type="button"
      >
        <Avatar address={address} size={size} />
      </button>

      {open ? (
        <div className={styles.menu} role="menu">
          {/* Truncated, because 44 characters is not something anybody reads —
              but tapping copies the whole thing, so shortening it does not
              also make it useless. */}
          <button
            className={styles.who}
            onClick={() => void copyAddress()}
            role="menuitem"
            type="button"
          >
            <code>{truncateAddress(address)}</code>
            <small>{addressCopied ? t('linkCopied') : t('copyAddress')}</small>
          </button>
          <button className={styles.item} onClick={() => void share()} role="menuitem" type="button">
            {copied ? t('linkCopied') : shareLabel}
          </button>
          {onSignOut ? (
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
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
