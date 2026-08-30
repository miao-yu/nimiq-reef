'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Stage } from '@/components/Stage';
import { GivePanel } from '@/components/GivePanel';
import { Dock } from '@/components/Dock';
import { Sheet } from '@/components/Sheet';
import { LookPicker } from '@/components/LookPicker';
import { COLLECTION_ICON, REEFS_ICON, SideRail } from '@/components/SideRail';
import { FieldGuide } from '@/components/FieldGuide';
import { StakePanel } from '@/components/StakePanel';
import { ShareButton } from '@/components/ShareButton';
import { AccountBar } from '@/components/AccountBar';
import { currentSession, signIn, signOut } from '@/lib/nimiq/session';
import { getProvider } from '@/lib/nimiq/provider';
import { installErrorReporting, report } from '@/lib/client-log';
import { adaptPlants } from '@/lib/tank/adapt';
import { depthForStake } from '@/lib/reef/vessel';
import { foodInWater } from '@/lib/reef/feeding';
import { liveClock } from '@/lib/reef/live';
import { SPECIES } from '@/lib/reef/species';
import { SEEDED_COMMUNITY, layoutCommunity, type CommunityPlant } from '@/lib/reef/community';
import { formatNimShort } from '@/lib/nimiq/policy';
import { useLocale } from '@/lib/i18n';
import type { ReefState } from '@/lib/reef/state';
import type { ProviderKind } from '@/lib/nimiq/types';
import stage from '@/components/Stage.module.css';
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

  const [fetchedAt, setFetchedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const loading = useRef(false);

  const load = useCallback(async () => {
    // One in flight at a time: the boundary trigger and the interval can
    // otherwise fire together on a slow connection.
    if (loading.current) return;
    loading.current = true;
    try {
      const res = await fetch('/api/reef', { credentials: 'same-origin', cache: 'no-store' });
      if (res.ok) setReef((await res.json()) as ReefState);
      else setReef(null);
      setFetchedAt(Date.now());
      setNow(Date.now());
    } finally {
      loading.current = false;
    }
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

  /*
   * The clocks run here; the state is refetched around them.
   *
   * The tick is unconditional. Gating it on visibilityState looked thriftier
   * and was a trap: a window that is merely unfocused or occluded reports
   * hidden, and a webview may report it at times a person is plainly looking
   * at the screen — which would freeze every countdown on the page, the exact
   * complaint this is fixing. Browsers already throttle timers in a truly
   * backgrounded tab, so the guard bought almost nothing.
   *
   * The *network* is a different matter, and stays gated below.
   */
  useEffect(() => {
    if (!reef) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    // Anything could have happened while away — a charge, a new day, a
    // stranger feeding the reef. Ask rather than extrapolate.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [reef, load]);

  const live = useMemo(
    () => (reef ? liveClock(reef, now - fetchedAt) : null),
    [reef, now, fetchedAt],
  );

  /*
   * Refetch on a boundary, and slowly otherwise.
   *
   * The boundary is the one that matters: the instant the ring completes, the
   * charge is real and the number should say so. The slow interval catches
   * everything that happens off-screen — being fed, the tick planting a day.
   */
  useEffect(() => {
    if (!live || !reef) return;
    if (live.epochTurned || live.dayRolled) {
      // The chain may not have advanced its own view yet; do not spin on it.
      const since = Date.now() - fetchedAt;
      if (since > 10_000) void load();
    }
  }, [live, reef, fetchedAt, load]);

  useEffect(() => {
    if (!reef) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [reef, load]);

  const communityPlants = community?.plants.length ? community.plants : SEEDED_COMMUNITY;
  const inhabitants = useMemo(
    () =>
      !known
        ? []
        : reef
          ? adaptPlants(reef.plants)
          : adaptPlants(layoutCommunity(communityPlants)),
    // Memoised because Tank's painter is keyed on this array's identity: a new
    // one every second would restart the animation loop on every tick.
    [known, reef, communityPlants],
  );

  return (
    /*
     * A screen, not a page.
     *
     * The tank fills the viewport and everything else floats on it: a thin bar
     * at the top, two actions at the bottom, and a sheet for the rest. Signed
     * out it is the same shape, so the app never rearranges itself under
     * somebody who has just signed in.
     */
    <Stage
      inhabitants={inhabitants}
      waterLevel={reef ? depthForStake(reef.stakedLuna) : 0.8}
      feedings={reef ? foodInWater(reef) : 0}
      floor={reef?.floor}
      wall={reef?.wall}
    >
      <header className={stage.hud}>
        {reef ? (
          <AccountBar reef={reef} onSignOut={() => void signOut().then(() => setReef(null))} />
        ) : (
          <div className={styles.brandRow}>
            <span className={styles.brand}>Reef</span>
            {/* The count was a dead number for the whole life of the app. */}
            <Link className={styles.sub} href="/community">
              {community && community.reefs > 0
                ? t('reefsLiving', { n: community.reefs })
                : t('communityReef')}{' '}
              →
            </Link>
          </div>
        )}
      </header>

      {reef ? (
        <>
          <SideRail
            items={[
              { href: '/collection', label: 'Collection', icon: COLLECTION_ICON },
              { href: '/community', label: 'Reefs', icon: REEFS_ICON },
            ]}
          />

          <Dock reef={reef} live={live} onChange={setReef} />

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

            <LookPicker reef={reef} onChange={setReef} />

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
              {/* A link, not a call. The Hub refuses `onboard` from any origin
                  that is not Nimiq's own, so making an account has to happen
                  in the wallet and the person comes back here to sign in. */}
              <a
                className={styles.secondary}
                href="https://wallet.nimiq.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('newToNimiq')}
              </a>
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
    </Stage>
  );
}
