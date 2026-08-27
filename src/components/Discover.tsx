'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/i18n';
import type { ReefState } from '@/lib/reef/state';
import styles from './Discover.module.css';

/**
 * Charges, and the way out to the water.
 *
 * This used to spend a charge in place: press a button, something appears.
 * That is a slot machine with better manners, and it is why the tank only ever
 * changed when you pressed it. The charge meter still lives here — it belongs
 * with the epoch clock — but the act of finding something happens at /fish.
 *
 * The language stays discovery, never opening: "a lionfish has appeared", not
 * "you won". An aquarium finds things; a casino pays out, and the difference
 * matters both for how it reads and for which rules it falls under.
 */
export function Discover({ reef }: { reef: ReefState }) {
  const { t } = useLocale();

  const full = reef.charges >= reef.maxCharges;

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.charges}>
          {full
            ? t('chargesFull', { max: reef.maxCharges })
            : t('chargesLeft', { n: reef.charges, max: reef.maxCharges })}
        </span>
        {reef.nextChargeInMs !== null ? (
          <span className={styles.next}>{t('nextCharge', { time: hhmm(reef.nextChargeInMs) })}</span>
        ) : (
          <span className={styles.next}>{t('epochLabel', { n: reef.epoch })}</span>
        )}
      </div>

      {/* Real chain progress, not a private timer. Everybody's bar sits at the
          same place at the same moment, which is the point of using the epoch. */}
      <div
        className={styles.epoch}
        role="progressbar"
        aria-valuenow={Math.round(reef.epochProgress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Epoch ${reef.epoch} progress`}
      >
        <span style={{ width: `${Math.round(reef.epochProgress * 100)}%` }} />
      </div>

      <div className={styles.pips} aria-hidden="true">
        {Array.from({ length: reef.maxCharges }, (_, i) => (
          <span key={i} className={i < reef.charges ? styles.pipOn : styles.pip} />
        ))}
      </div>

      <Link
        className={styles.cta}
        href="/fish"
        aria-disabled={reef.charges < 1}
        onClick={(e) => {
          if (reef.charges < 1) e.preventDefault();
        }}
      >
        {t('goFishing')}
      </Link>


      {reef.charges < 1 ? <p className={styles.note}>{t('noCharges')}</p> : null}

      {/* Where charges come from was invisible, and the omission fooled the
          person who specified the rule. If the author can be surprised by it,
          nobody else stands a chance. */}
      <details className={styles.how}>
        <summary>{t('chargeSource')}</summary>
        <p>{t('chargeIncoming')}</p>
      </details>

    </div>
  );
}

function hhmm(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
