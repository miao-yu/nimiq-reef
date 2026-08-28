'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from '@/lib/i18n';
import { report } from '@/lib/client-log';
import { getProvider } from '@/lib/nimiq/provider';
import { formatAddress, normalizeAddress, truncateAddress } from '@/lib/nimiq/address';
import { Avatar } from './Avatar';
import type { ReefState } from '@/lib/reef/state';
import styles from './GivePanel.module.css';

interface Candidate {
  address: string;
  species: string[];
}

/**
 * Feeding somebody else's reef.
 *
 * Feeding your own is a button in the dock now — it is one of the two things
 * you do, and it needed no panel around it. What is left here is the part that
 * takes a decision: who.
 *
 * Feeding a stranger needs no social graph, which matters because we have no
 * way to build one. The address is the identity: it draws the identicon, it is
 * what you paste to feed a friend, and it discloses nothing a Nimiq node would
 * not tell anybody who asked.
 *
 * Two doors, deliberately unequal. Nimiq Pay can vouch for a device, so it gets
 * suggestions — strangers picked by us. A browser cannot, so it may only feed a
 * reef whose address the user brought with them, rate limited to one a day on
 * the signed-in wallet.
 */
export function GivePanel({ reef, onChange }: { reef: ReefState; onChange: (r: ReefState) => void }) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [gave, setGave] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState('');

  // Arriving from somebody's reef page: /?feed=<address>. Prefilled rather
  // than fed automatically — feeding is somebody else's tank, and a link
  // should never spend your one a day without being asked.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('feed');
    const parsed = wanted ? normalizeAddress(wanted) : null;
    if (parsed) setTyped(formatAddress(parsed));
  }, []);

  // Only Nimiq Pay can supply this. Its absence no longer disables giving, it
  // just closes the suggestion list — the part that would actually be worth
  // farming, since it is where Reef hands out reefs the user did not choose.
  useEffect(() => {
    void getProvider()
      .then((p) => (p.kind === 'nimiq-pay' ? p.deviceId() : null))
      .then(setDeviceId)
      .catch(() => setDeviceId(null));
  }, []);

  const loadCandidates = useCallback(async (device: string) => {
    try {
      const res = await fetch(`/api/feed/candidates?device=${encodeURIComponent(device)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { candidates: Candidate[]; gaveToday: boolean };
      setCandidates(data.gaveToday ? [] : data.candidates);
      if (data.gaveToday) setGave('');
    } catch (cause) {
      report('feed:candidates', cause);
    }
  }, []);

  useEffect(() => {
    if (deviceId) void loadCandidates(deviceId);
  }, [deviceId, loadCandidates]);

  async function give(address: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/feed/give', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, device: deviceId }),
      });
      const data = (await res.json()) as { reef?: ReefState; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Could not feed that reef.');
      setGave(truncateAddress(address));
      setCandidates([]);
      if (data.reef) onChange(data.reef);
    } catch (cause) {
      report('feed:give', cause);
      setError(cause instanceof Error ? cause.message : 'Could not feed that reef.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>{t('feedStranger')}</h3>
      {reef.receivedToday > 0 ? (
        <p className={styles.received}>{t('fedBy', { n: reef.receivedToday })}</p>
      ) : null}
      {gave !== null ? (
        <p className={styles.note}>{gave ? t('feedGiven', { who: gave }) : t('feedStrangerNote')}</p>
      ) : deviceId ? (
        <>
          <p className={styles.note}>{t('feedStrangerNote')}</p>
          <div className={styles.candidates}>
            {candidates.map((c) => (
              <button
                key={c.address}
                className={styles.candidate}
                onClick={() => void give(c.address)}
                disabled={busy}
                type="button"
              >
                {/* The reef itself, from the same renderer its owner sees.
                    Three names told you nothing about what you were feeding. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.card}
                  src={`/r/${encodeURIComponent(c.address.replace(/\s/g, ''))}/card`}
                  alt=""
                  width={96}
                  height={60}
                  loading="lazy"
                />
                <span className={styles.who}>
                  <Avatar address={c.address} size={22} />
                  {truncateAddress(c.address)}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className={styles.note}>{t('feedNeedsApp')}</p>
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              const target = normalizeAddress(typed);
              if (!target) {
                setError(t('feedAddressInvalid'));
                return;
              }
              void give(target);
            }}
          >
            <input
              className={styles.input}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={t('feedAddressPlaceholder')}
              aria-label={t('feedByAddress')}
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
            />
            <button className={styles.go} disabled={busy || typed.length === 0} type="submit">
              {t('feed')}
            </button>
          </form>
        </>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
