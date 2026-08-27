'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { drawFishing, type Phase } from '@/lib/fishing/scene';
import { WATERS, WATER_ORDER, type WaterKey } from '@/lib/reef/ponds';
import { truncateAddress } from '@/lib/nimiq/address';
import { report } from '@/lib/client-log';
import styles from './page.module.css';

interface Pond {
  address: string;
  water: WaterKey;
  label: string;
  blurb: string;
  stakers: number;
  yours: boolean;
}

interface Caught {
  id: number;
  species: string;
  tier: string;
  slot: number | null;
  label: string;
  blurb: string;
}

/** How long the bite lasts. Under about 1.2s reads as broken, not hard. */
const STRIKE_MS = 2000;
/** Not up to 30: half a minute of nothing on a phone loses the charge to a notification. */
const WAIT_MIN_MS = 3000;
const WAIT_MAX_MS = 18000;

const DURATION: Partial<Record<Phase, number>> = {
  casting: 700,
  sinking: 500,
  bite: STRIKE_MS,
  landing: 900,
};

/** Waters in ladder order, but whichever one holds your validator comes first. */
function groupPonds(ponds: Pond[]): [WaterKey, Pond[]][] {
  const by = new Map<WaterKey, Pond[]>();
  for (const p of ponds) {
    if (!by.has(p.water)) by.set(p.water, []);
    by.get(p.water)!.push(p);
  }
  return [...by.entries()].sort((a, b) => {
    const mine = (g: Pond[]) => (g.some((p) => p.yours) ? 0 : 1);
    return mine(a[1]) - mine(b[1]) || WATER_ORDER.indexOf(a[0]) - WATER_ORDER.indexOf(b[0]);
  });
}

export default function Fish() {
  const [ponds, setPonds] = useState<Pond[] | null>(null);
  const [charges, setCharges] = useState(0);
  const [pond, setPond] = useState<Pond | null>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [caught, setCaught] = useState<Caught | null>(null);
  const [forgiven, setForgiven] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvas = useRef<HTMLCanvasElement>(null);
  const startedAt = useRef<number>(0);
  const waitFor = useRef<number>(0);
  const phaseRef = useRef<Phase>('ready');
  phaseRef.current = phase;

  /**
   * One settle per cast.
   *
   * The animation loop runs every frame, and `phase` does not change until the
   * request comes back — so without this the loop fired `settle('missed')` on
   * every frame of the gap and a single missed bite spent every charge the
   * player had. Caught by playing it, not by reading it.
   */
  const settling = useRef(false);

  useEffect(() => {
    void fetch('/api/ponds', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Could not load ponds.'))))
      .then((d: { ponds: Pond[]; charges: number }) => {
        setPonds(d.ponds);
        setCharges(d.charges);
      })
      .catch((cause) => {
        report('ponds', cause);
        setError('Could not load the ponds.');
      });
  }, []);

  const enter = useCallback((next: Phase) => {
    startedAt.current = performance.now();
    setPhase(next);
  }, []);

  const settle = useCallback(
    async (outcome: 'landed' | 'missed') => {
      if (!pond || settling.current) return;
      settling.current = true;
      try {
        const res = await fetch('/api/fish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pond: pond.address, outcome }),
        });
        const data = (await res.json()) as {
          caught?: Caught;
          forgiven?: boolean;
          reef?: { charges: number };
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
        setCharges(data.reef?.charges ?? 0);
        if (outcome === 'landed' && data.caught) {
          setCaught(data.caught);
          enter('landing');
        } else {
          setForgiven(Boolean(data.forgiven));
          enter('missed');
        }
      } catch (cause) {
        report('fish', cause);
        setError(cause instanceof Error ? cause.message : 'Something went wrong.');
        enter('ready');
      } finally {
        settling.current = false;
      }
    },
    [pond, enter],
  );

  // The clock. Phases advance here rather than on timers, so a backgrounded tab
  // resumes where it should instead of firing everything at once on return.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = canvas.current;
      if (el) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = el.clientWidth;
        const h = el.clientHeight;
        if (el.width !== w * dpr || el.height !== h * dpr) {
          el.width = w * dpr;
          el.height = h * dpr;
        }
        const ctx = el.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          const p = phaseRef.current;
          const span = p === 'waiting' ? waitFor.current : (DURATION[p] ?? 1);
          const elapsed = performance.now() - startedAt.current;
          drawFishing(ctx, {
            width: w,
            height: h,
            time: performance.now() / 1000,
            palette: WATERS[pond?.water ?? 'shallows'].palette,
            phase: p,
            progress: Math.min(1, elapsed / span),
            fish: caught
              ? {
                  species: caught.species as never,
                  tier: caught.tier as never,
                  seed: caught.id * 2654435761,
                }
              : undefined,
          });

          // Advance.
          if (p === 'casting' && elapsed >= DURATION.casting!) enter('sinking');
          else if (p === 'sinking' && elapsed >= DURATION.sinking!) {
            waitFor.current = WAIT_MIN_MS + Math.random() * (WAIT_MAX_MS - WAIT_MIN_MS);
            enter('waiting');
          } else if (p === 'waiting' && elapsed >= waitFor.current) enter('bite');
          else if (p === 'bite' && elapsed >= STRIKE_MS && !settling.current) void settle('missed');
          else if (p === 'landing' && elapsed >= DURATION.landing!) enter('landed');
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pond, caught, enter, settle]);

  function strike() {
    if (phase === 'bite' && !settling.current) void settle('landed');
  }

  function cast() {
    setCaught(null);
    setError(null);
    setForgiven(false);
    enter('casting');
  }

  const hint =
    phase === 'ready'
      ? 'Cast a line'
      : phase === 'casting' || phase === 'sinking'
        ? '…'
        : phase === 'waiting'
          ? 'Watch the float'
          : phase === 'bite'
            ? 'Now!'
            : phase === 'landing'
              ? 'Got it'
              : '';

  if (!pond) {
    return (
      <main className={styles.wrap}>
        <header className={styles.head}>
          <Link className={styles.back} href="/">← Reef</Link>
          <span className={styles.charges}>{charges} charges</span>
        </header>
        <h1 className={styles.title}>Pick a pond</h1>
        <p className={styles.sub}>
          Every validator is water of its own. What lives there depends on the water — not on how
          much you have staked.
        </p>
        {error ? <p className={styles.error}>{error}</p> : null}
        {/* Grouped by water. Six waters across ~37 validators means the same
            name appears half a dozen times; listed flat, distinct ponds read as
            duplicates of each other. Under a heading, the repetition is the
            point — these really are all trenches. */}
        {groupPonds(ponds ?? []).map(([water, group]) => (
          <section key={water} className={styles.group}>
            <h2 className={styles.groupHead}>
              {WATERS[water].label}
              <span className={styles.count}>{group.length}</span>
            </h2>
            <p className={styles.groupBlurb}>{WATERS[water].blurb}</p>
            <ul className={styles.ponds}>
              {group.map((p) => (
                <li key={p.address}>
                  <button className={styles.pond} onClick={() => setPond(p)} type="button">
                    <Avatar address={p.address} size={32} />
                    <span className={styles.pondText}>
                      <code>{truncateAddress(p.address)}</code>
                      <small>
                        {p.stakers} {p.stakers === 1 ? 'staker' : 'stakers'}
                      </small>
                    </span>
                    {p.yours ? <span className={styles.yours}>yours</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {ponds && ponds.length === 0 ? <p className={styles.sub}>No ponds right now.</p> : null}
      </main>
    );
  }

  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <button className={styles.back} onClick={() => setPond(null)} type="button">
          ← Ponds
        </button>
        <span className={styles.charges}>{charges} charges</span>
      </header>

      <div className={styles.pondName}>
        <Avatar address={pond.address} size={26} />
        <strong>{pond.label}</strong>
      </div>

      {/* The whole surface is the strike target. Asking for a small button
          during a two-second window would be a reflex test of aim, not timing. */}
      <button
        className={`${styles.stage} ${phase === 'bite' ? styles.biting : ''}`}
        onClick={strike}
        type="button"
        aria-label={phase === 'bite' ? 'Strike' : 'Fishing'}
      >
        <canvas ref={canvas} className={styles.canvas} />
        <span className={styles.hint}>{hint}</span>
      </button>

      {phase === 'landed' && caught ? (
        <div className={styles.result}>
          <span className={`${styles.tier} ${styles[caught.tier] ?? ''}`}>{caught.tier}</span>
          <h2>{caught.label}</h2>
          <p>{caught.blurb}</p>
          <p className={styles.where}>
            {caught.slot === null
              ? 'Your tank is full — it is waiting in the field guide.'
              : 'Added to your reef.'}
          </p>
          <div className={styles.actions}>
            <button className={styles.cta} onClick={cast} disabled={charges < 1} type="button">
              {charges < 1 ? 'No charges left' : 'Cast again'}
            </button>
            <Link className={styles.secondary} href="/">Back to the reef</Link>
          </div>
        </div>
      ) : null}

      {phase === 'missed' ? (
        <div className={styles.result}>
          <h2>It got away</h2>
          <p>{forgiven ? 'First one of the day is free. Try again.' : 'That cost you a charge.'}</p>
          <div className={styles.actions}>
            <button className={styles.cta} onClick={cast} disabled={charges < 1} type="button">
              {charges < 1 ? 'No charges left' : 'Cast again'}
            </button>
            <Link className={styles.secondary} href="/">Back to the reef</Link>
          </div>
        </div>
      ) : null}

      {phase === 'ready' ? (
        <button className={styles.cta} onClick={cast} disabled={charges < 1} type="button">
          {charges < 1 ? 'No charges left' : 'Cast'}
        </button>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
    </main>
  );
}
