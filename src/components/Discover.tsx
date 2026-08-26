'use client';

import { useState } from 'react';
import { useLocale } from '@/lib/i18n';
import { report } from '@/lib/client-log';
import type { ReefState } from '@/lib/reef/state';
import styles from './Discover.module.css';

interface Found {
  label: string;
  tier: string;
  slot: number | null;
}

/**
 * Spend a charge, find something.
 *
 * The language is discovery, never opening: "a lionfish has appeared", not
 * "you won". An aquarium finds things; a casino pays out, and the difference
 * matters both for how it reads and for which rules it falls under.
 */
export function Discover({ reef, onChange }: { reef: ReefState; onChange: (r: ReefState) => void }) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Found | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function roll() {
    setBusy(true);
    setError(null);
    setFound(null);
    try {
      const res = await fetch('/api/roll', { method: 'POST' });
      const data = (await res.json()) as {
        discovered?: { label: string; tier: string; slot: number | null };
        reef?: ReefState;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? 'Nothing found.');
      if (data.discovered) setFound(data.discovered);
      if (data.reef) onChange(data.reef);
    } catch (cause) {
      report('roll', cause);
      setError(cause instanceof Error ? cause.message : 'Nothing found.');
    } finally {
      setBusy(false);
    }
  }

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

      <button
        className={styles.cta}
        onClick={() => void roll()}
        disabled={busy || reef.charges < 1}
        type="button"
      >
        {busy ? t('discovering') : t('discover')}
      </button>

      {found ? (
        <p className={styles.found}>
          {found.tier === 'common' || found.tier === 'uncommon'
            ? t('found', { label: found.label })
            : t('foundRare', { label: found.label, tier: found.tier })}
          {found.slot === null ? ` ${t('tankFull')}` : ''}
        </p>
      ) : null}

      {reef.charges < 1 && !found ? <p className={styles.note}>{t('noCharges')}</p> : null}

      {/* Where charges come from was invisible, and the omission fooled the
          person who specified the rule. If the author can be surprised by it,
          nobody else stands a chance. */}
      <details className={styles.how}>
        <summary>{t('chargeSource')}</summary>
        <p>{t('chargeIncoming')}</p>
      </details>

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}

function hhmm(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
