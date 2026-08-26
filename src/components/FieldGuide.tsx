'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from '@/lib/i18n';
import { report } from '@/lib/client-log';
import { SPECIES } from '@/lib/reef/species';
import type { ReefState } from '@/lib/reef/state';
import type { SpeciesKey, Tier } from '@/lib/tank/types';
import styles from './FieldGuide.module.css';

interface Specimen {
  id: number;
  species: SpeciesKey;
  tier: Tier;
  seed: number;
  slot: number | null;
}

interface GuideEntry {
  species: SpeciesKey;
  tier: Tier;
  count: number;
  discovered: boolean;
  unlockDay: number;
}

/**
 * Everything ever discovered, and outlines of everything not yet.
 *
 * Locked species appear as silhouettes with their unlock day. That is what
 * lets the ladder run to a year without the guide feeling empty — you are not
 * looking at a blank, you are looking at an outline.
 *
 * It is also where curating happens: discovery is unlimited, display is
 * scarce, and returning something to the reef never removes it from here.
 */
export function FieldGuide({ reef, onChange }: { reef: ReefState; onChange: (r: ReefState) => void }) {
  const { t } = useLocale();
  const [entries, setEntries] = useState<GuideEntry[]>([]);
  const [specimens, setSpecimens] = useState<Specimen[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/guide', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { entries: GuideEntry[]; specimens: Specimen[] };
      setEntries(data.entries);
      setSpecimens(data.specimens);
    } catch (cause) {
      report('guide', cause);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, reef.plants.length]);

  async function move(id: number, action: 'display' | 'release') {
    setBusy(true);
    try {
      const res = await fetch(`/api/specimen/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { reef?: ReefState };
      if (data.reef) onChange(data.reef);
      await load();
    } catch (cause) {
      report('guide:move', cause);
    } finally {
      setBusy(false);
    }
  }

  const found = entries.filter((e) => e.discovered).length;

  return (
    <div className={styles.panel}>
      <button className={styles.header} onClick={() => setOpen(!open)} type="button" aria-expanded={open}>
        <span className={styles.title}>{t('guide')}</span>
        <span className={styles.count}>{t('guideCount', { found, total: entries.length })}</span>
      </button>

      {open ? (
        <>
          <ul className={styles.species}>
            {entries.map((e) => (
              <li key={e.species} className={e.discovered ? styles.known : styles.unknown}>
                <span className={styles.name}>
                  {e.discovered ? SPECIES[e.species].label : '???'}
                </span>
                <span className={styles.meta}>
                  {e.discovered ? `${e.tier} · ${e.count}` : t('locked', { n: e.unlockDay })}
                </span>
              </li>
            ))}
          </ul>

          {specimens.length > 0 ? (
            <ul className={styles.holdings}>
              {specimens.map((s) => (
                <li key={s.id}>
                  <span className={styles.name}>{SPECIES[s.species].label}</span>
                  <button
                    className={styles.move}
                    disabled={busy}
                    onClick={() => void move(s.id, s.slot === null ? 'display' : 'release')}
                    type="button"
                  >
                    {s.slot === null ? t('display') : t('release')}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
