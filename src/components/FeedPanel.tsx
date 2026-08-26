'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from '@/lib/i18n';
import { report } from '@/lib/client-log';
import { getProvider } from '@/lib/nimiq/provider';
import type { ReefState } from '@/lib/reef/state';
import styles from './FeedPanel.module.css';

interface Candidate {
  handle: string;
  species: string[];
}

/**
 * Feeding: your own reef, and somebody else's.
 *
 * Feeding a stranger needs no social graph, which matters because we have no
 * way to build one — wallet addresses are all we have. It is also the only
 * place in the app where two people touch.
 */
export function FeedPanel({ reef, onChange }: { reef: ReefState; onChange: (r: ReefState) => void }) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [gave, setGave] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only Nimiq Pay can supply this. Outside it, giving is disabled rather than
  // falling back to a wallet check — a wallet costs nothing to create, so the
  // fallback would be the farm we are trying to stop.
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

  async function feedOwn() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/feed', { method: 'POST' });
      const data = (await res.json()) as { reef?: ReefState; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Could not feed.');
      if (data.reef) onChange(data.reef);
    } catch (cause) {
      report('feed', cause);
      setError(cause instanceof Error ? cause.message : 'Could not feed.');
    } finally {
      setBusy(false);
    }
  }

  async function give(handle: string) {
    if (!deviceId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/feed/give', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, device: deviceId }),
      });
      const data = (await res.json()) as { reef?: ReefState; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Could not feed that reef.');
      setGave(handle);
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
      <button
        className={styles.cta}
        onClick={() => void feedOwn()}
        disabled={busy || reef.fedToday}
        type="button"
      >
        {reef.fedToday ? t('fedAlready') : t('feed')}
      </button>
      <p className={styles.note}>{t('feedNote')}</p>

      {reef.receivedToday > 0 ? (
        <p className={styles.received}>{t('fedBy', { n: reef.receivedToday })}</p>
      ) : null}

      <div className={styles.divider} />

      <h3 className={styles.title}>{t('feedStranger')}</h3>
      {!deviceId ? (
        <p className={styles.note}>{t('feedNeedsApp')}</p>
      ) : gave !== null ? (
        <p className={styles.note}>{gave ? t('feedGiven', { handle: gave }) : t('feedStrangerNote')}</p>
      ) : (
        <>
          <p className={styles.note}>{t('feedStrangerNote')}</p>
          <div className={styles.candidates}>
            {candidates.map((c) => (
              <button
                key={c.handle}
                className={styles.candidate}
                onClick={() => void give(c.handle)}
                disabled={busy}
                type="button"
              >
                {c.handle}
              </button>
            ))}
          </div>
        </>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
