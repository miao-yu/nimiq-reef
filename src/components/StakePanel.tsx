'use client';

import { useEffect, useState } from 'react';
import { getProvider } from '@/lib/nimiq/provider';
import { formatNim, MINIMUM_STAKE_NIM, nimToLuna } from '@/lib/nimiq/policy';
import { report } from '@/lib/client-log';
import type { GroveState } from '@/lib/grove';
import styles from './StakePanel.module.css';

interface Validator {
  address: string;
  balance: number;
  numStakers: number;
}

interface Props {
  grove: GroveState;
  onDone: () => void | Promise<void>;
}

/**
 * Staking, from inside the app.
 *
 * Convenience only. Grove reads the chain, so a delegation made anywhere —
 * Nimiq Pay's own staking screen, the desktop wallet, a hand-built transaction
 * — reaches the grove on the next tick just the same. Nothing here is a
 * gatekeeper.
 */
export function StakePanel({ grove, onDone }: Props) {
  const [validators, setValidators] = useState<Validator[]>([]);
  const [delegation, setDelegation] = useState(grove.delegation ?? '');
  const [amount, setAmount] = useState(String(MINIMUM_STAKE_NIM));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const alreadyStaking = grove.stakedLuna > 0 && grove.delegation !== null;

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
      // grove — so refresh rather than pretending the stake is already counted.
      await onDone();
    } catch (cause) {
      report('stake', cause);
      setError(cause instanceof Error ? cause.message : 'The wallet declined that.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className={styles.panel}>
        <h2 className={styles.title}>Stake sent</h2>
        <p className={styles.note}>
          It counts from the next watering, within fifteen minutes. Your NIM stays in the staking
          contract under your own address — Grove only reads it.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>
        {alreadyStaking ? 'Add to your stake' : 'Start staking'}
        <span> — this is what makes the grove grow</span>
      </h2>

      {alreadyStaking ? (
        <p className={styles.note}>
          Delegated to <code>{grove.delegation}</code> · {formatNim(grove.stakedLuna)} NIM
        </p>
      ) : (
        <label className={styles.field}>
          <span>Validator</span>
          <select
            value={delegation}
            onChange={(e) => setDelegation(e.target.value)}
            disabled={busy || validators.length === 0}
          >
            <option value="">
              {validators.length === 0 ? 'Loading the elected set…' : 'Choose one'}
            </option>
            {validators.map((v) => (
              <option key={v.address} value={v.address}>
                {v.address.slice(0, 14)}… · {v.numStakers} stakers
              </option>
            ))}
          </select>
          <small>Every elected validator, sorted by address. Grove has no preference.</small>
        </label>
      )}

      <label className={styles.field}>
        <span>Amount in NIM</span>
        <input
          type="number"
          inputMode="decimal"
          min={MINIMUM_STAKE_NIM}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
        />
        <small>Minimum {MINIMUM_STAKE_NIM} NIM. You can unstake whenever you like.</small>
      </label>

      <button className={styles.cta} onClick={() => void stake()} disabled={busy} type="button">
        {busy ? 'Waiting for the wallet…' : alreadyStaking ? 'Add stake' : 'Delegate'}
      </button>

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
