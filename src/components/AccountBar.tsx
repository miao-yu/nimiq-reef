'use client';

import { IdentityMenu } from './IdentityMenu';
import { useLocale } from '@/lib/i18n';
import type { ReefState } from '@/lib/reef/state';
import styles from './AccountBar.module.css';

/**
 * The header: the app on the left, where you are in the middle, who you are on
 * the right.
 *
 * The identity control itself lives in IdentityMenu, which somebody else's
 * reef reuses — the header is only the frame around it.
 */
export function AccountBar({ reef, onSignOut }: { reef: ReefState; onSignOut: () => void }) {
  const { t } = useLocale();
  return (
    <header className={styles.bar}>
      <span className={styles.brand}>Reef</span>
      <span className={styles.day}>{t('day', { n: reef.day })}</span>
      <IdentityMenu
        address={reef.address}
        shareUrl={typeof window === 'undefined' ? undefined : window.location.origin}
        shareLabel={t('shareYours')}
        onSignOut={onSignOut}
      />
    </header>
  );
}
