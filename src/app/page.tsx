'use client';

import { useEffect, useState } from 'react';
import { Grove } from '@/components/Grove';
import { currentSession, signIn, signOut } from '@/lib/nimiq/session';
import { getProvider } from '@/lib/nimiq/provider';
import type { Plant } from '@/lib/grove';
import type { ProviderKind } from '@/lib/nimiq/types';
import styles from './page.module.css';

/**
 * Placeholder plot so the app shows something real while the engine is built.
 * In production this comes from the wallet's staking history.
 */
const DEMO_PLOT: Plant[] = [
  { x: 0.075, species: 'sprout', plantedDay: 1, seed: 26 },
  { x: 0.165, species: 'sprout', plantedDay: 1, seed: 14 },
  { x: 0.255, species: 'sprout', plantedDay: 4, seed: 31 },
  { x: 0.375, species: 'fern', plantedDay: 7, seed: 52 },
  { x: 0.525, species: 'elder', plantedDay: 60, seed: 77 },
  { x: 0.645, species: 'bloom', plantedDay: 21, seed: 8 },
  { x: 0.745, species: 'fern', plantedDay: 30, seed: 63 },
  { x: 0.845, species: 'bloom', plantedDay: 45, seed: 45 },
  { x: 0.935, species: 'sprout', plantedDay: 12, seed: 90 },
];

function signInLabel(kind: ProviderKind | null): string {
  return kind === 'hub' ? 'Sign in with Nimiq Wallet' : 'Claim your plot';
}

function providerNote(kind: ProviderKind | null): string {
  switch (kind) {
    case 'nimiq-pay':
      return 'Running inside Nimiq Pay.';
    case 'hub':
      return 'Signing via the Nimiq Wallet — staking needs Nimiq Pay.';
    case 'mock':
      return 'Dev wallet — not a real signature.';
    default:
      return 'Looking for a wallet…';
  }
}

export default function Home() {
  const [day, setDay] = useState(30);
  const [address, setAddress] = useState<string | null>(null);
  const [kind, setKind] = useState<ProviderKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void currentSession().then(setAddress);
    void getProvider().then((p) => setKind(p.kind));
  }, []);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const { address: signedIn } = await signIn();
      setAddress(signedIn);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    await signOut();
    setAddress(null);
  }

  return (
    <main className={styles.wrap}>
      <div className={styles.head}>
        <h1 className={styles.title}>Nimiq Grove</h1>
        <span className={styles.day}>Day {day}</span>
      </div>

      <div className={styles.canvasFrame}>
        <Grove plants={DEMO_PLOT} day={day} className={styles.canvas} />
      </div>

      <input
        className={styles.slider}
        type="range"
        min={1}
        max={90}
        value={day}
        onChange={(e) => setDay(Number(e.target.value))}
        aria-label="Day of staking"
      />

      <div className={styles.account}>
        {address ? (
          <>
            <span className={styles.addr}>{address}</span>
            <button className={styles.button} onClick={() => void disconnect()} type="button">
              Sign out
            </button>
          </>
        ) : (
          <button
            className={styles.button}
            onClick={() => void connect()}
            disabled={busy}
            type="button"
          >
            {busy ? 'Waiting for the wallet…' : signInLabel(kind)}
          </button>
        )}
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <p className={styles.hint}>
        {providerNote(kind)} Plot is a placeholder until the engine lands.
      </p>
    </main>
  );
}
