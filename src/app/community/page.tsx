'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ReefCard, type CommunityReefCard } from '@/components/ReefCard';
import { report } from '@/lib/client-log';
import styles from './page.module.css';

/**
 * Every reef, so "N reefs living" stops being a number nobody can follow.
 *
 * An ordinary scrolling document, not the game stage — this is a list, and the
 * stage exists to hold a screen still.
 *
 * Its real job is feeding. Outside Nimiq Pay there was no way to find somebody
 * to feed short of being handed an address, which left the social half of the
 * app dark for anybody on a desktop. Every card here is a target.
 */
const SORTS = [
  { key: 'new', label: 'Newest' },
  { key: 'species', label: 'Most species' },
  // Ordered by fewest feeds ever received: the reefs nobody has found yet.
  { key: 'quiet', label: 'Least fed' },
] as const;

type SortKey = (typeof SORTS)[number]['key'];

export default function Community() {
  const [reefs, setReefs] = useState<CommunityReefCard[]>([]);
  const [sort, setSort] = useState<SortKey>('new');
  const [cursor, setCursor] = useState<string | null>(null);
  const [more, setMore] = useState(true);
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [feeding, setFeeding] = useState<string | null>(null);
  const [fed, setFed] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : { address: null }))
      .then((d: { address: string | null }) => setSignedIn(Boolean(d.address)))
      .catch(() => setSignedIn(false));
  }, []);

  const load = useCallback(
    async (nextSort: SortKey, nextCursor: string | null) => {
      setBusy(true);
      try {
        const params = new URLSearchParams({ sort: nextSort, limit: '12' });
        if (nextCursor) params.set('cursor', nextCursor);
        const res = await fetch(`/api/community/reefs?${params}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Could not load reefs.');
        const data = (await res.json()) as { reefs: CommunityReefCard[]; next: string | null };
        setReefs((prev) => (nextCursor ? [...prev, ...data.reefs] : data.reefs));
        setCursor(data.next);
        setMore(Boolean(data.next));
      } catch (cause) {
        report('community:list', cause);
        setNote('Could not load reefs.');
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(sort, null);
  }, [sort, load]);

  async function feed(address: string) {
    setFeeding(address);
    setNote(null);
    try {
      const res = await fetch('/api/feed/give', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      // A crashed route answers with an HTML error page, and parsing that as
      // JSON reports a syntax error where a person needs a sentence.
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Could not feed that reef.');
      setFed((prev) => new Set(prev).add(address));
      setNote('Fed. One a day.');
    } catch (cause) {
      report('community:feed', cause);
      setNote(cause instanceof Error ? cause.message : 'Could not feed that reef.');
    } finally {
      setFeeding(null);
    }
  }

  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <Link className={styles.back} href="/">← Reef</Link>
        <h1 className={styles.title}>Reefs living</h1>
        <p className={styles.sub}>
          Every reef here fills from somebody&rsquo;s real Nimiq staking. Feed one — it costs you
          nothing and they will see it.
        </p>
      </header>

      <div className={styles.sorts} role="tablist" aria-label="Sort reefs">
        {SORTS.map((s) => (
          <button
            key={s.key}
            className={`${styles.sortBtn} ${sort === s.key ? styles.sortOn : ''}`}
            onClick={() => setSort(s.key)}
            role="tab"
            aria-selected={sort === s.key}
            type="button"
          >
            {s.label}
          </button>
        ))}
      </div>

      {note ? <p className={styles.note}>{note}</p> : null}

      <div className={styles.grid}>
        {reefs.map((reef) => (
          <ReefCard
            key={reef.address}
            reef={reef}
            onFeed={signedIn ? feed : undefined}
            feeding={feeding === reef.address}
            fed={fed.has(reef.address)}
          />
        ))}
      </div>

      {reefs.length === 0 && !busy ? <p className={styles.note}>No reefs yet.</p> : null}

      {more ? (
        <button
          className={styles.loadMore}
          onClick={() => void load(sort, cursor)}
          disabled={busy}
          type="button"
        >
          {busy ? 'Loading…' : 'Load more'}
        </button>
      ) : reefs.length > 0 ? (
        <p className={styles.note}>That is all of them.</p>
      ) : null}

      {!signedIn ? (
        <p className={styles.note}>
          <Link href="/">Claim a reef</Link> to feed these.
        </p>
      ) : null}
    </main>
  );
}
