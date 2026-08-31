'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LookTile } from '@/components/LookTile';
import { SPECIES } from '@/lib/reef/species';
import { traitKey, isShiny } from '@/lib/tank/traits';
import { report } from '@/lib/client-log';
import type { SpeciesKey, Tier } from '@/lib/tank/types';
import styles from './page.module.css';

interface Specimen {
  id: number;
  species: SpeciesKey;
  tier: Tier;
  seed: number;
  slot: number | null;
}
interface Entry {
  species: SpeciesKey;
  tier: Tier;
  count: number;
  discovered: boolean;
  shiny: number;
  looks: number;
  looksPossible: number;
}

/**
 * Every distinct look you have ever owned.
 *
 * The collection this page shows was always there — the trait system draws
 * between 1,344 and 5,376 distinct looks per tier, and the field guide reported
 * that as "Guppy ×40". Nothing here is generated or stored: a look is a pure
 * function of the seed and tier already on every specimen, so this is a view
 * over data the app has been keeping all along.
 *
 * Released specimens count. Letting one go is not un-seeing it.
 */
export default function Collection() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [specimens, setSpecimens] = useState<Specimen[]>([]);
  const [shiny, setShiny] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'out'>('loading');

  useEffect(() => {
    void fetch('/api/guide')
      .then(async (r) => {
        if (r.status === 401) {
          setState('out');
          return;
        }
        const d = (await r.json()) as { entries: Entry[]; specimens: Specimen[]; shiny: number };
        setEntries(d.entries ?? []);
        setSpecimens(d.specimens ?? []);
        setShiny(d.shiny ?? 0);
        setState('ready');
      })
      .catch((cause) => {
        report('collection', cause);
        setState('ready');
      });
  }, []);

  // One tile per distinct look, keeping the earliest specimen that showed it.
  const looksBySpecies = new Map<SpeciesKey, Specimen[]>();
  const seen = new Set<string>();
  for (const s of [...specimens].reverse()) {
    const key = `${s.species}:${traitKey(s.seed, s.tier)}:${isShiny(s.seed, s.tier) ? 1 : 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const list = looksBySpecies.get(s.species) ?? [];
    list.push(s);
    looksBySpecies.set(s.species, list);
  }

  const found = entries.filter((e) => e.discovered);

  if (state === 'out') {
    return (
      <main className={styles.wrap}>
        <Link className={styles.back} href="/">
          ← My reef
        </Link>
        <p className={styles.note}>Sign in to see your collection.</p>
      </main>
    );
  }

  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <Link className={styles.back} href="/">
          ← My reef
        </Link>
        <h1 className={styles.title}>Collection</h1>
        <p className={styles.sub}>
          Every creature is one of thousands of possible looks. These are the ones you have had.
          {shiny > 0 ? (
            <>
              {' '}
              You have found <strong className={styles.shinyCount}>{shiny} shiny</strong>.
            </>
          ) : null}
        </p>
      </header>

      {state === 'loading' ? <p className={styles.note}>Loading…</p> : null}

      {state === 'ready' && found.length === 0 ? (
        <p className={styles.note}>Nothing caught yet. Cast a line and come back.</p>
      ) : null}

      {found.map((e) => {
        const looks = looksBySpecies.get(e.species) ?? [];
        return (
          <section key={e.species} className={styles.group}>
            <h2 className={styles.species}>
              {SPECIES[e.species].label}
              <span className={styles.meta}>
                {e.looksPossible > 0
                  ? `${e.looks} of ${e.looksPossible.toLocaleString()} looks · `
                  : ''}
                {e.count} caught
                {e.shiny > 0 ? <span className={styles.shinyCount}> · ✦ {e.shiny}</span> : null}
              </span>
            </h2>
            <div className={styles.grid}>
              {looks.map((s) => (
                // Addressed by what it looks like, not by which specimen it
                // was: the page redraws from these three values alone, so it
                // works for somebody who owns nothing.
                <Link
                  key={s.id}
                  className={styles.tileLink}
                  href={`/look/${s.species}/${s.tier}/${s.seed}`}
                  aria-label={`${SPECIES[s.species].label}, ${s.tier}`}
                >
                  <LookTile
                    species={s.species}
                    tier={s.tier}
                    seed={s.seed}
                    shiny={isShiny(s.seed, s.tier)}
                  />
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
