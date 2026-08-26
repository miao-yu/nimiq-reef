'use client';

import { useEffect, useState } from 'react';
import { getProvider } from '@/lib/nimiq/provider';
import { formatNim, MINIMUM_STAKE_NIM, nimToLuna } from '@/lib/nimiq/policy';
import { report } from '@/lib/client-log';
import type { ReefState } from '@/lib/reef';
import { useLocale } from '@/lib/i18n';
import styles from './StakePanel.module.css';

interface Validator {
  address: string;
  balance: number;
  numStakers: number;
}

interface Props {
  reef: ReefState;
  onDone: () => void | Promise<void>;
}

/**
 * Staking, from inside the app.
 *
 * Convenience only. Reef reads the chain, so a delegation made anywhere —
 * Nimiq Pay's own staking screen, the desktop wallet, a hand-built transaction
 * — reaches the reef on the next tick just the same. Nothing here is a
 * gatekeeper.
 */
export function StakePanel({ reef, onDone }: Props) {
  const { t } = useLocale();
  const [validators, setValidators] = useState<Validator[]>([]);
  const [delegation, setDelegation] = useState(reef.delegation ?? '');
  const [amount, setAmount] = useState(String(MINIMUM_STAKE_NIM));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const alreadyStaking = reef.stakedLuna > 0 && reef.delegation !== null;

  useEffect(() => {
    if (alreadyStaking) return;
    void fetch('/api/validators')
      .then((r) => (r.ok ? r.json() : { validators: [] }))
      .then((d: { validators: Validator[] }) => setValidators(d.validators))
      .catch((e) => report('validators', e));
  }, [alreadyStaking]);

  async function stake() {
    setError(null);
    const nim = Number(amount);
    if (!Number.isFinite(nim) || nim < MINIMUM_STAKE_NIM) {
      setError(`The protocol requires at least ${MINIMUM_STAKE_NIM} NIM.`);
      return;
    }
    if (!alreadyStaking && !delegation) {
      setError('Choose a validator to delegate to.');
      return;
    }

    setBusy(true);
    try {
      const provider = await getProvider();
      const value = nimToLuna(nim);
      const hash = alreadyStaking
        ? await provider.sendStakeTransaction({ value })
        : await provider.sendNewStakerTransaction({ delegation, value });
      setSent(hash);
      // The chain needs a moment, and the tick is what actually updates the
      // reef — so refresh rather than pretending the stake is already counted.
      await onDone();
    } catch (cause) {
      const browserLimit = cause instanceof Error && cause.message === 'BROWSER_STAKING_UNAVAILABLE';
      if (!browserLimit) report('stake', cause);
      setError(
        browserLimit
          ? t('stakeElsewhere')
          : cause instanceof Error
            ? cause.message
            : 'The wallet declined that.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className={styles.panel}>
        <h2 className={styles.title}>{t('stakeSent')}</h2>
        <p className={styles.note}>
{t('stakeSentNote')}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>
        {alreadyStaking ? t('addStake') : t('startStaking')}
        <span> {t('whatGrows')}</span>
      </h2>

      {alreadyStaking ? (
        <p className={styles.note}>
          Delegated to <code>{reef.delegation}</code> · {formatNim(reef.stakedLuna)} NIM
        </p>
      ) : (
        <label className={styles.field}>
          <span>{t('validator')}</span>
          <select
            value={delegation}
            onChange={(e) => setDelegation(e.target.value)}
            disabled={busy || validators.length === 0}
          >
            <option value="">
              {validators.length === 0 ? t('loadingValidators') : t('chooseValidator')}
            </option>
            {validators.map((v) => (
              <option key={v.address} value={v.address}>
                {v.address.slice(0, 14)}… · {v.numStakers} stakers
              </option>
            ))}
          </select>
          <small>{t('noPreference')}</small>
        </label>
      )}

      <label className={styles.field}>
        <span>{t('amountNim')}</span>
        <input
          type="number"
          inputMode="decimal"
          min={MINIMUM_STAKE_NIM}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
        />
        <small>{t('minimumNim', { n: MINIMUM_STAKE_NIM })}</small>
      </label>

      <button className={styles.cta} onClick={() => void stake()} disabled={busy} type="button">
        {busy ? t('waitingWallet') : alreadyStaking ? t('addStakeCta') : t('delegate')}
      </button>

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
