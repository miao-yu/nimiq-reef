'use client';

import { useCallback, useEffect, useState } from 'react';
import { Tank } from '@/components/Tank';
import { Discover } from '@/components/Discover';
import { FeedPanel } from '@/components/FeedPanel';
import { FieldGuide } from '@/components/FieldGuide';
import { StakePanel } from '@/components/StakePanel';
import { ShareButton } from '@/components/ShareButton';
import { currentSession, signIn, signOut } from '@/lib/nimiq/session';
import { getProvider } from '@/lib/nimiq/provider';
import { installErrorReporting, report } from '@/lib/client-log';
import { adaptPlants } from '@/lib/tank/adapt';
import { fillForStake } from '@/lib/tank/geometry';
import { SPECIES } from '@/lib/reef/species';
import { SEEDED_COMMUNITY, layoutCommunity, type CommunityPlant } from '@/lib/reef/community';
import { formatNim } from '@/lib/nimiq/policy';
import { useLocale } from '@/lib/i18n';
import type { ReefState } from '@/lib/reef/state';
import type { ProviderKind } from '@/lib/nimiq/types';
import styles from './page.module.css';

interface Community {
  plants: CommunityPlant[];
  reefs: number;
  totalPlants: number;
  stakedToday: number;
}

export default function Home() {
  const { t } = useLocale();
  const [kind, setKind] = useState<ProviderKind | null>(null);
  const [reef, setReef] = useState<ReefState | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/reef', { credentials: 'same-origin', cache: 'no-store' });
    if (res.ok) setReef((await res.json()) as ReefState);
    else setReef(null);
  }, []);

  useEffect(() => {
    installErrorReporting();
    // Unconditional and first: the page has to be alive before anybody is
    // asked for a wallet.
    void fetch('/api/community')
      .then((r) => (r.ok ? r.json() : null))
      .then(setCommunity)
      .catch((e) => report('community', e));
    void getProvider()
      .then((p) => setKind(p.kind))
      .catch((e) => report('getProvider', e));
    void currentSession().then((address) => {
      if (address) void load();
    });
  }, [load]);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      await signIn();
      await load();
    } catch (cause) {
      report('connect:failed', cause);
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  const communityPlants = community?.plants.length ? community.plants : SEEDED_COMMUNITY;
  const inhabitants = reef ? adaptPlants(reef.plants) : adaptPlants(layoutCommunity(communityPlants));

  return (
    <main className={styles.wrap}>
      <div className={styles.head}>
        <h1 className={styles.title}>Reef</h1>
        <span className={styles.day}>
          {reef
            ? t('day', { n: reef.day })
            : community && community.reefs > 0
              ? t('reefsLiving', { n: community.reefs })
              : t('communityReef')}
        </span>
      </div>

      <div className={styles.canvasFrame}>
        <Tank
          inhabitants={inhabitants}
          tankFill={reef ? fillForStake(reef.stakedLuna) : 0.7}
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
              <dd>{reef.stakedLuna > 0 ? formatNim(reef.stakedLuna) : '—'}</dd>
            </div>
            <div>
              <dt>{t('slots')}</dt>
              <dd>
                {reef.plants.length}/{reef.plotsUnlocked}
              </dd>
            </div>
            <div>
              <dt>{t('streak')}</dt>
              <dd>{reef.feedStreak}</dd>
            </div>
          </dl>

          {reef.chainOffline ? <p className={styles.warn}>{t('chainOffline')}</p> : null}

          <Discover reef={reef} onChange={setReef} />
          <FeedPanel reef={reef} onChange={setReef} />
          <FieldGuide reef={reef} onChange={setReef} />

          <p className={styles.hint}>
            {reef.next
              ? t('unlocksAfter', {
                  species: SPECIES[reef.next.species].label,
                  n: reef.next.atDay,
                  away: reef.next.daysAway,
                })
              : t('everythingUnlocked')}
          </p>

          <StakePanel reef={reef} onDone={load} />

          <div className={styles.account}>
            <span className={styles.addr}>{reef.handle}</span>
            <ShareButton label={t('shareYours')} />
            <button
              className={styles.ghost}
              onClick={() => void signOut().then(() => setReef(null))}
              type="button"
            >
              {t('signOut')}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.hint}>{t('claimPrompt')}</p>
          <div className={styles.account}>
            <button
              className={styles.button}
              onClick={() => void connect()}
              disabled={busy}
              type="button"
            >
              {busy ? t('waitingWallet') : kind === 'hub' ? t('signInWallet') : t('claimReef')}
            </button>
            <ShareButton label={t('shareThis')} />
          </div>
        </>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}
    </main>
  );
}
