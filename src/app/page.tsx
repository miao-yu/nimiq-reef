'use client';

import { useCallback, useEffect, useState } from 'react';
import { Grove } from '@/components/Grove';
import { currentSession, signIn, signOut } from '@/lib/nimiq/session';
import { getProvider } from '@/lib/nimiq/provider';
import { SPECIES, type GroveState, type Plant, type SpeciesKey } from '@/lib/grove';
import { formatNim, MINIMUM_STAKE_NIM } from '@/lib/nimiq/policy';
import type { ProviderKind } from '@/lib/nimiq/types';
import { installErrorReporting, report } from '@/lib/client-log';
import styles from './page.module.css';

/** Shown before sign-in, so the page is alive before anyone commits anything. */
const SAMPLE: Plant[] = [
  { x: 0.125, species: 'sprout', plantedDay: 1, seed: 26 },
  { x: 0.375, species: 'fern', plantedDay: 7, seed: 52 },
  { x: 0.625, species: 'bloom', plantedDay: 21, seed: 8 },
  { x: 0.875, species: 'elder', plantedDay: 60, seed: 77 },
];

export default function Home() {
  const [kind, setKind] = useState<ProviderKind | null>(null);
  const [grove, setGrove] = useState<GroveState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/grove', { credentials: 'same-origin', cache: 'no-store' });
    if (res.ok) {
      setGrove((await res.json()) as GroveState);
    } else {
      report('load:not-ok', `HTTP ${res.status}`);
      setGrove(null);
    }
  }, []);

  useEffect(() => {
    installErrorReporting();
    void getProvider().then((p) => setKind(p.kind)).catch((e) => report('getProvider', e));
    void currentSession().then((address) => {
      if (address) void load();
    });
  }, [load]);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      report('connect:start', 'begin');
      await signIn();
      report('connect:signed-in', 'verify ok');
      await load();
      report('connect:loaded', 'grove fetched');
    } catch (cause) {
      report('connect:failed', cause);
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    await signOut();
    setGrove(null);
  }

  async function plant(species: SpeciesKey) {
    const plot = grove?.freePlots[0];
    if (plot === undefined) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/grove/plant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ species, plot }),
      });
      const data = (await res.json()) as GroveState & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Could not plant that.');
      setGrove(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not plant that.');
    } finally {
      setBusy(false);
    }
  }

  const plants = grove?.plants.length ? grove.plants : grove ? [] : SAMPLE;
  const day = grove?.day ?? 60;

  return (
    <main className={styles.wrap}>
      <div className={styles.head}>
        <h1 className={styles.title}>Nimiq Grove</h1>
        <span className={styles.day}>{grove ? `Day ${grove.day}` : 'A sample grove'}</span>
      </div>

      <div className={styles.canvasFrame}>
        <Grove plants={plants} day={day} className={styles.canvas} />
      </div>

      {grove ? (
        <>
          <dl className={styles.stats}>
            <div>
              <dt>Days staked</dt>
              <dd>{grove.daysStaked}</dd>
            </div>
            <div>
              <dt>Staked</dt>
              <dd>{grove.stakedLuna > 0 ? `${formatNim(grove.stakedLuna)} NIM` : '—'}</dd>
            </div>
            <div>
              <dt>Plots</dt>
              <dd>
                {grove.plotsUnlocked - grove.freePlots.length}/{grove.plotsUnlocked}
              </dd>
            </div>
          </dl>

          {grove.chainOffline ? (
            <p className={styles.warn}>
              Can&apos;t reach the chain right now, so this is from what we last saw. Nothing is lost.
            </p>
          ) : null}

          {grove.freePlots.length > 0 ? (
            <div className={styles.planter}>
              <h2 className={styles.planterTitle}>
                Plant in plot {grove.freePlots[0]! + 1}
                <span> — you can&apos;t change it later</span>
              </h2>
              <div className={styles.speciesRow}>
                {grove.speciesUnlocked.map((key) => (
                  <button
                    key={key}
                    className={styles.species}
                    disabled={busy}
                    onClick={() => void plant(key)}
                    type="button"
                  >
                    {SPECIES[key].label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className={styles.hint}>
              Every cleared plot is planted. {grove.next ? null : 'The grove is complete.'}
            </p>
          )}

          {grove.next ? (
            <p className={styles.hint}>
              {SPECIES[grove.next.species].label} unlocks after {grove.next.atDay} unbroken days
              staked — {grove.next.daysAway} to go.
              {grove.stakedLuna === 0 ? ` Staking starts at ${MINIMUM_STAKE_NIM} NIM.` : ''}
            </p>
          ) : null}

          <div className={styles.account}>
            <span className={styles.addr}>{grove.address}</span>
            <button className={styles.ghost} onClick={() => void disconnect()} type="button">
              Sign out
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.hint}>
            This is somebody else&apos;s grove. Claim a plot and yours starts growing today —
            staking is optional, and the first plant is free.
          </p>
          <div className={styles.account}>
            <button className={styles.button} onClick={() => void connect()} disabled={busy} type="button">
              {busy ? 'Waiting for the wallet…' : kind === 'hub' ? 'Sign in with Nimiq Wallet' : 'Claim your plot'}
            </button>
          </div>
        </>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}
    </main>
  );
}
