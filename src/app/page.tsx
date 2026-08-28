'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Tank } from '@/components/Tank';
import { GivePanel } from '@/components/GivePanel';
import { Dock } from '@/components/Dock';
import { Sheet } from '@/components/Sheet';
import { FieldGuide } from '@/components/FieldGuide';
import { StakePanel } from '@/components/StakePanel';
import { ShareButton } from '@/components/ShareButton';
import { AccountBar } from '@/components/AccountBar';
import { currentSession, signIn, signOut, signUp } from '@/lib/nimiq/session';
import { getProvider } from '@/lib/nimiq/provider';
import { installErrorReporting, report } from '@/lib/client-log';
import { adaptPlants } from '@/lib/tank/adapt';
import { depthForStake } from '@/lib/reef/vessel';
import { foodInWater } from '@/lib/reef/feeding';
import { SPECIES } from '@/lib/reef/species';
import { SEEDED_COMMUNITY, layoutCommunity, type CommunityPlant } from '@/lib/reef/community';
import { formatNimShort } from '@/lib/nimiq/policy';
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
  /**
   * False until we know whose reef this is.
   *
   * The community tank used to render on the first paint and then be replaced
   * once the session resolved, so a refresh showed a stranger's fish for a
   * beat and then "lost" them. An empty tank for that beat is honest; the
   * wrong tank is not.
   */
  const [known, setKnown] = useState(false);
  const [sheet, setSheet] = useState(false);

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
    void currentSession()
      .then(async (address) => {
        if (address) await load();
      })
      .catch((e) => report('session', e))
      .finally(() => setKnown(true));
  }, [load]);

  async function connect(fresh = false) {
    setBusy(true);
    setError(null);
    try {
      await (fresh ? signUp() : signIn());
      await load();
    } catch (cause) {
      report(fresh ? 'signup:failed' : 'connect:failed', cause);
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  const communityPlants = community?.plants.length ? community.plants : SEEDED_COMMUNITY;
  const inhabitants = !known
    ? []
    : reef
      ? adaptPlants(reef.plants)
      : adaptPlants(layoutCommunity(communityPlants));

  return (
    /*
     * A screen, not a page.
     *
     * The tank fills the viewport and everything else floats on it: a thin bar
     * at the top, two actions at the bottom, and a sheet for the rest. Signed
     * out it is the same shape, so the app never rearranges itself under
     * somebody who has just signed in.
     */
    <main className={styles.screen}>
      <Tank
        inhabitants={inhabitants}
        waterLevel={reef ? depthForStake(reef.stakedLuna) : 0.8}
        feedings={reef ? foodInWater(reef) : 0}
        className={styles.canvas}
      />

      {/* Scrims, so type over moving water always holds. */}
      <div className={styles.topScrim} aria-hidden="true" />
      <div className={styles.bottomScrim} aria-hidden="true" />

      <header className={styles.hud}>
        {reef ? (
          <AccountBar reef={reef} onSignOut={() => void signOut().then(() => setReef(null))} />
        ) : (
          <div className={styles.brandRow}>
            <span className={styles.brand}>Reef</span>
            <span className={styles.sub}>
              {community && community.reefs > 0
                ? t('reefsLiving', { n: community.reefs })
                : t('communityReef')}
            </span>
          </div>
        )}
      </header>

      {reef ? (
        <>
          <Dock reef={reef} onChange={setReef} />

          <button
            className={styles.pull}
            onClick={() => setSheet(true)}
            type="button"
            aria-label={t('guide')}
          >
            <span>
              {reef.plants.length}/{reef.plotsUnlocked} · {t('day', { n: reef.day })}
            </span>
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <circle cx="10" cy="10" r="8.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="10" cy="5.9" r="1.15" fill="currentColor" />
              <path d="M10 9v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <Sheet open={sheet} onClose={() => setSheet(false)} title={t('day', { n: reef.day })}>
            <dl className={styles.stats}>
              <div>
                <dt>{t('daysStaked')}</dt>
                <dd>{reef.daysStaked}</dd>
              </div>
              <div>
                <dt>{t('staked')}</dt>
                <dd>{reef.stakedLuna > 0 ? formatNimShort(reef.stakedLuna) : '—'}</dd>
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

            {/* Where charges come from stays one tap away, never further: the
                omission fooled the person who wrote the rule once already. */}
            <details className={styles.how}>
              <summary>{t('chargeSource')}</summary>
              <p>{t('chargeIncoming')}</p>
            </details>

            <FieldGuide reef={reef} onChange={setReef} />
            <GivePanel reef={reef} onChange={setReef} />
            <StakePanel reef={reef} onDone={load} />

            <Link className={styles.previewLink} href="/preview">
              {t('seePreview')} →
            </Link>
          </Sheet>
        </>
      ) : (
        <div className={styles.gate}>
          <p className={styles.hint}>{t('claimPrompt')}</p>
          <div className={styles.gateRow}>
            <button
              className={styles.button}
              onClick={() => void connect()}
              disabled={busy}
              type="button"
            >
              {busy ? t('waitingWallet') : kind === 'hub' ? t('signInWallet') : t('claimReef')}
            </button>
            <span className={styles.onWater}>
              <ShareButton label={t('shareThis')} />
            </span>
          </div>
          {kind === 'hub' ? (
            <div className={styles.gateLinks}>
              <button
                className={styles.secondary}
                onClick={() => void connect(true)}
                disabled={busy}
                type="button"
              >
                {t('newToNimiq')}
              </button>
              <Link className={styles.secondary} href="/open">
                {t('openOnPhone')}
              </Link>
              <Link className={styles.secondary} href="/preview">
                {t('seePreview')}
              </Link>
            </div>
          ) : null}
        </div>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}
    </main>
  );
}
