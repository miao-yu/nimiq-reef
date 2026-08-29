'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Stage } from './Stage';
import { Sheet } from './Sheet';
import { RingButton } from './RingButton';
import { Avatar } from './Avatar';
import { adaptPlants } from '@/lib/tank/adapt';
import { depthForStake, slotsFor } from '@/lib/reef/vessel';
import { foodInWater } from '@/lib/reef/feeding';
import { SPECIES } from '@/lib/reef/species';
import { truncateAddress } from '@/lib/nimiq/address';
import { formatNimShort } from '@/lib/nimiq/policy';
import { report } from '@/lib/client-log';
import type { PublicReef } from '@/lib/reef/public';
import stage from './Stage.module.css';
import styles from './PublicReefView.module.css';

/**
 * Somebody else's reef, on the same screen as your own.
 *
 * The identical stage and the identical renderer — a still PNG made this look
 * like a listing of a reef rather than the reef. What changes is the controls:
 * there is exactly one thing you can do here, so there is one button, and
 * everything you might want to read is behind the same handle as at home.
 *
 * Rendered from data the server already passed in, so the text is in the HTML
 * for crawlers even though the tank needs a canvas.
 */
export function PublicReefView({ reef }: { reef: PublicReef }) {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [known, setKnown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [fed, setFed] = useState(false);

  useEffect(() => {
    void fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : { address: null }))
      .then((d: { address: string | null }) => setMe(d.address))
      .catch(() => setMe(null))
      .finally(() => setKnown(true));
  }, []);

  const mine = me !== null && me.replace(/\s/g, '') === reef.address.replace(/\s/g, '');
  const room = Math.max(slotsFor(reef.stakedLuna), reef.plants.length);

  function say(message: string) {
    setNote(message);
    window.setTimeout(() => setNote((n) => (n === message ? null : n)), 2800);
  }

  async function feed() {
    setBusy(true);
    try {
      const res = await fetch('/api/feed/give', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: reef.address }),
      });
      // A crashed route answers with an HTML error page, and parsing that as
      // JSON reports a syntax error where a person needs a sentence.
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Could not feed that reef.');
      setFed(true);
      say('Fed. They will see it.');
    } catch (cause) {
      report('public:feed', cause);
      say(cause instanceof Error ? cause.message : 'Could not feed that reef.');
    } finally {
      setBusy(false);
    }
  }

  const counts = new Map<string, number>();
  for (const plant of reef.plants) counts.set(plant.species, (counts.get(plant.species) ?? 0) + 1);

  return (
    <Stage
      inhabitants={adaptPlants(reef.plants)}
      waterLevel={depthForStake(reef.stakedLuna)}
      feedings={foodInWater({ fedToday: reef.fedToday, receivedToday: reef.receivedToday })}
      label={`A reef on day ${reef.day} with ${reef.plants.length} on display.`}
    >
      <header className={stage.hud}>
        <div className={styles.bar}>
          <Link className={styles.back} href="/community">
            ← Reefs
          </Link>
          <Avatar address={reef.address} size={26} />
          <code className={styles.address}>{truncateAddress(reef.address)}</code>
        </div>
      </header>

      <button
        className={styles.pull}
        onClick={() => setOpen(true)}
        type="button"
        aria-label="Reef details"
      >
        <span>
          {reef.plants.length}/{room} · Day {reef.day}
        </span>
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <circle cx="10" cy="10" r="8.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="10" cy="5.9" r="1.15" fill="currentColor" />
          <path d="M10 9v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      <div className={styles.dock}>
        {note ? <p className={styles.note}>{note}</p> : null}
        {/* One action, because there is only one thing to do on somebody
            else's reef. Signed out it becomes the way in. */}
        {known && !me ? (
          <Link className={styles.claim} href="/">
            Claim a reef to feed this one
          </Link>
        ) : (
          <RingButton
            label={mine ? 'Your reef' : fed ? 'Fed' : 'Feed this reef'}
            tone="coral"
            progress={fed || mine ? 1 : 0}
            disabled={mine || fed || busy || !me}
            onClick={() => void feed()}
            onBlocked={() => say(mine ? 'This one is yours.' : 'Fed. One a day.')}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              {[
                [6, 5, -0.5],
                [14, 8, 0.4],
                [9, 13, 0.9],
                [17, 15, -0.3],
                [11, 19, 0.2],
              ].map(([x, y, r], i) => (
                <ellipse
                  key={i}
                  cx={x}
                  cy={y}
                  rx="2.6"
                  ry="1.1"
                  fill="#E8A94B"
                  transform={`rotate(${(r as number) * 60} ${x} ${y})`}
                />
              ))}
            </svg>
          </RingButton>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title={`Day ${reef.day}`}>
        <dl className={styles.stats}>
          <div>
            <dt>Days staked</dt>
            <dd>{reef.daysStaked}</dd>
          </div>
          <div>
            <dt>Staked</dt>
            <dd>{reef.stakedLuna > 0 ? formatNimShort(reef.stakedLuna) : '—'}</dd>
          </div>
          <div>
            <dt>Room</dt>
            <dd>
              {reef.plants.length}/{room}
            </dd>
          </div>
          <div>
            <dt>Fed</dt>
            <dd>{reef.receivedLifetime}</dd>
          </div>
        </dl>

        {counts.size > 0 ? (
          <ul className={styles.species}>
            {[...counts].map(([key, n]) => (
              <li key={key}>
                {SPECIES[key as keyof typeof SPECIES]?.label ?? key}
                {n > 1 ? <span className={styles.times}> ×{n}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>Nothing on display yet.</p>
        )}

        <p className={styles.empty}>
          A reef fills from real Nimiq staking. <Link href="/">Start your own.</Link>
        </p>
      </Sheet>
    </Stage>
  );
}
