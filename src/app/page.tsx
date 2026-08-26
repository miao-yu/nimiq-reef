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
  type ReefState,
  type Plant,
  type SpeciesKey,
} from '@/lib/reef';
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
  const [reef, setReef] = useState<ReefState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [community, setCommunity] = useState<{
    plants: CommunityPlant[];
    reefs: number;
    totalPlants: number;
    stakedToday: number;
  } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/reef', { credentials: 'same-origin', cache: 'no-store' });
    if (res.ok) {
      setReef((await res.json()) as ReefState);
    } else {
      report('load:not-ok', `HTTP ${res.status}`);
      setReef(null);
    }
  }, []);

  useEffect(() => {
    installErrorReporting();
    // Load the community reef first and unconditionally: the page has to be
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
      report('connect:loaded', 'reef fetched');
    } catch (cause) {
      report('connect:failed', cause);
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    await signOut();
    setReef(null);
  }

  async function plant(species: SpeciesKey) {
    const plot = reef?.freePlots[0];
    if (plot === undefined) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/reef/plant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ species, plot }),
      });
      const data = (await res.json()) as ReefState & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Could not plant that.');
      setReef(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not plant that.');
    } finally {
      setBusy(false);
    }
  }

  // Signed in: your own reef. Signed out: everyone's, falling back to a
  // seeded one so the very first visitor never meets bare soil.
  const communityPlants = community?.plants.length ? community.plants : SEEDED_COMMUNITY;
  const plants: Plant[] = reef ? reef.plants : layoutCommunity(communityPlants);

  return (
    <main className={styles.wrap}>
      <div className={styles.head}>
        <h1 className={styles.title}>Reef</h1>
        <span className={styles.day}>
          {reef
            ? t('day', { n: reef.day })
            : community && community.reefs > 0
              ? t('reefsGrowing', { n: community.reefs })
              : t('communityReef')}
        </span>
      </div>

      <div className={styles.canvasFrame}>
        <Tank
          inhabitants={adaptPlants(plants)}
          tankFill={reef ? fillForStake(reef.stakedLuna) : 0.62}
          className={styles.canvas}
        />
      </div>

      {reef ? (
        <>
          <dl className={styles.stats}>
            <div>
              <dt>{t('daysStaked')}</dt>
              <dd>{reef.daysStaked}</dd>
            </div>
            <div>
              <dt>{t('staked')}</dt>
              <dd>{reef.stakedLuna > 0 ? `${formatNim(reef.stakedLuna)} NIM` : '—'}</dd>
            </div>
            <div>
              <dt>{t('plots')}</dt>
              <dd>
                {reef.plotsUnlocked - reef.freePlots.length}/{reef.plotsUnlocked}
              </dd>
            </div>
          </dl>

          {reef.chainOffline ? (
            <p className={styles.warn}>
              {t('chainOffline')}
            </p>
          ) : null}

          {reef.freePlots.length > 0 ? (
            <div className={styles.planter}>
              <h2 className={styles.planterTitle}>
                {/* An empty plot after you already planted means you *earned* one.
                    Saying "plant in plot 2" makes a reward read as the same
                    question asked twice. */}
                {reef.plants.length > 0
                  ? t('newPlotOpened', { n: reef.freePlots[0]! + 1 })
                  : t('plantInPlot', { n: reef.freePlots[0]! + 1 })}
                <span> {t('permanent')}</span>
              </h2>
              {reef.plants.length > 0 && reef.daysStaked > 0 ? (
                <p className={styles.hint}>
                  {t('unlockedByStaking', {
                    species: SPECIES[reef.speciesUnlocked[reef.speciesUnlocked.length - 1]!].label,
                  })}
                </p>
              ) : null}
              <div className={styles.speciesRow}>
                {reef.speciesUnlocked.map((key) => (
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

          {reef.next ? (
            <p className={styles.hint}>
              {t('unlocksAfter', {
                species: SPECIES[reef.next.species].label,
                n: reef.next.atDay,
                away: reef.next.daysAway,
              })}
            </p>
          ) : null}

          <StakePanel reef={reef} onDone={load} />

          <div className={styles.account}>
            <span className={styles.addr}>{reef.address}</span>
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
