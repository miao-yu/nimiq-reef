'use client';

import { useCallback, useEffect, useState } from 'react';
import { Tank } from '@/components/Tank';
import { StakePanel } from '@/components/StakePanel';
import { ShareButton } from '@/components/ShareButton';
import { currentSession, signIn, signOut } from '@/lib/nimiq/session';
import { getProvider } from '@/lib/nimiq/provider';
import {
  SPECIES,
  SEEDED_COMMUNITY,
  layoutCommunity,
  type CommunityPlant,
  type GroveState,
  type Plant,
  type SpeciesKey,
} from '@/lib/grove';
import { formatNim } from '@/lib/nimiq/policy';
import type { ProviderKind } from '@/lib/nimiq/types';
import { installErrorReporting, report } from '@/lib/client-log';
import { adaptPlants } from '@/lib/tank/adapt';
import { fillForStake } from '@/lib/tank/geometry';
import { useLocale } from '@/lib/i18n';
import styles from './page.module.css';

export default function Home() {
  const { t } = useLocale();
  const [kind, setKind] = useState<ProviderKind | null>(null);
  const [grove, setGrove] = useState<GroveState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [community, setCommunity] = useState<{
    plants: CommunityPlant[];
    groves: number;
    totalPlants: number;
    stakedToday: number;
  } | null>(null);

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
    // Load the community grove first and unconditionally: the page has to be
    // alive before anyone is asked for a wallet.
    void fetch('/api/community')
      .then((r) => (r.ok ? r.json() : null))
      .then(setCommunity)
      .catch((e) => report('community', e));
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

  // Signed in: your own grove. Signed out: everyone's, falling back to a
  // seeded one so the very first visitor never meets bare soil.
  const communityPlants = community?.plants.length ? community.plants : SEEDED_COMMUNITY;
  const plants: Plant[] = grove ? grove.plants : layoutCommunity(communityPlants);

  return (
    <main className={styles.wrap}>
      <div className={styles.head}>
        <h1 className={styles.title}>Reef</h1>
        <span className={styles.day}>
          {grove
            ? t('day', { n: grove.day })
            : community && community.groves > 0
              ? t('grovesGrowing', { n: community.groves })
              : t('communityGrove')}
        </span>
      </div>

      <div className={styles.canvasFrame}>
        <Tank
          inhabitants={adaptPlants(plants)}
          tankFill={grove ? fillForStake(grove.stakedLuna) : 0.62}
          className={styles.canvas}
        />
      </div>

      {grove ? (
        <>
          <dl className={styles.stats}>
            <div>
              <dt>{t('daysStaked')}</dt>
              <dd>{grove.daysStaked}</dd>
            </div>
            <div>
              <dt>{t('staked')}</dt>
              <dd>{grove.stakedLuna > 0 ? `${formatNim(grove.stakedLuna)} NIM` : '—'}</dd>
            </div>
            <div>
              <dt>{t('plots')}</dt>
              <dd>
                {grove.plotsUnlocked - grove.freePlots.length}/{grove.plotsUnlocked}
              </dd>
            </div>
          </dl>

          {grove.chainOffline ? (
            <p className={styles.warn}>
              {t('chainOffline')}
            </p>
          ) : null}

          {grove.freePlots.length > 0 ? (
            <div className={styles.planter}>
              <h2 className={styles.planterTitle}>
                {t('plantInPlot', { n: grove.freePlots[0]! + 1 })}
                <span> {t('permanent')}</span>
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
              {t('allPlanted')}
            </p>
          )}

          {grove.next ? (
            <p className={styles.hint}>
              {t('unlocksAfter', {
                species: SPECIES[grove.next.species].label,
                n: grove.next.atDay,
                away: grove.next.daysAway,
              })}
            </p>
          ) : null}

          <StakePanel grove={grove} onDone={load} />

          <div className={styles.account}>
            <span className={styles.addr}>{grove.address}</span>
            <ShareButton label={t('shareYours')} />
            <button className={styles.ghost} onClick={() => void disconnect()} type="button">
              {t('signOut')}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.hint}>
            {community && community.totalPlants > 0
              ? `${community.totalPlants} ${community.totalPlants === 1 ? 'plant' : 'plants'} growing here right now${community.stakedToday > 0 ? `, ${community.stakedToday} watered by a live stake today` : ''}. `
              : 'This is where everyone plants. '}
            {t('claimPrompt')}
          </p>
          <div className={styles.account}>
            <button className={styles.button} onClick={() => void connect()} disabled={busy} type="button">
              {busy ? t('waitingWallet') : kind === 'hub' ? t('signInWallet') : t('claimPlot')}
            </button>
            <ShareButton label={t('shareThis')} />
          </div>
        </>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}
    </main>
  );
}
