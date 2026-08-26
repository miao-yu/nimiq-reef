'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Tank } from '@/components/Tank';
import { depthForStake } from '@/lib/reef/vessel';
import { SPECIES, SPECIES_ORDER, speciesUnlocked } from '@/lib/reef/species';
import { tierWeights, slotsFor } from '@/lib/reef/progression';
import { rng } from '@/lib/tank/rng';
import type { Inhabitant } from '@/lib/tank/types';
import { useLocale } from '@/lib/i18n';
import styles from './page.module.css';

/**
 * The simulator.
 *
 * Progression runs to a year, which is right for an asset people stake for
 * years but leaves anybody evaluating the app in a fortnight staring at day
 * one. This shows the whole arc in ten seconds, and it costs almost nothing
 * because the renderer is already fully parametric.
 *
 * Labelled a preview throughout — never dressed up as somebody's own reef.
 */

/**
 * How far the preview will go.
 *
 * Two reasons, and the tighter one wins. Never reveal a species that is not
 * built; and beyond that, do not spend the long-haul reveals here — the
 * octopus, the turtle and the whale are the reasons to still be staking in six
 * months, and a slider that shows them for free is a slider that spends them.
 *
 * The field guide still lists them as silhouettes with their unlock day, so
 * people know a whale exists at 365. Knowing it exists without having seen it
 * is the stronger version.
 */
const PREVIEW_CAP_DAYS = 90;
const LAST_BUILT = Math.max(...SPECIES_ORDER.map((k) => SPECIES[k].unlockDay));
const MAX_DAY = Math.min(PREVIEW_CAP_DAYS, LAST_BUILT);

/** A plausible tank for a given day, not a real one. Deterministic per day. */
function populate(days: number, seed: number): Inhabitant[] {
  const unlocked = speciesUnlocked(days);
  const out: Inhabitant[] = [];
  let n = 0;
  unlocked.forEach((species, i) => {
    const def = SPECIES[species];
    // Commoner things school; an apex predator does not.
    const count =
      def.tier === 'common' ? 3 : def.tier === 'uncommon' ? 2 : def.tier === 'rare' ? 2 : 1;
    for (let k = 0; k < count; k++) {
      // Assume it was found near its unlock day, so dragging the year forward
      // also ages what is already in the tank rather than only adding to it.
      out.push({
        species,
        tier: def.tier,
        ageDays: Math.max(0, days - def.unlockDay),
        seed: seed + i * 7919 + k * 104729,
      });
      n++;
    }
  });
  void n;
  return out;
}

/**
 * Names the next species only while it is inside the cap. Past that it stays
 * unnamed — otherwise the line under the slider announces the octopus long
 * before the slider itself would ever show one.
 */
function nextLine(days: number): string {
  const next = SPECIES_ORDER.find((k) => SPECIES[k].unlockDay > days);
  if (!next || SPECIES[next].unlockDay > MAX_DAY) return 'And more, over the years.';
  return `${SPECIES[next].label} arrives on day ${SPECIES[next].unlockDay}.`;
}

export default function Preview() {
  const { t } = useLocale();
  const [days, setDays] = useState(1);
  const [nimSlider, setNimSlider] = useState(0);
  const [seed, setSeed] = useState(20260826);

  const nim = Math.round(Math.pow(10, 2 + (nimSlider / 1000) * 4));
  const inhabitants = useMemo(() => populate(days, seed), [days, seed]);
  const weights = tierWeights(days);

  return (
    <main className={styles.wrap}>
      <div className={styles.head}>
        <h1 className={styles.title}>Preview</h1>
        <span className={styles.sub}>Not your reef — a simulation</span>
      </div>
      <Link className={styles.back} href="/">
        ← {t('backToReef')}
      </Link>

      <div className={styles.canvasFrame}>
        <Tank
          inhabitants={inhabitants}
          waterLevel={depthForStake(nim * 1e5)}
          className={styles.canvas}
          label={`A simulated reef after ${days} days staked with ${nim} NIM.`}
        />
      </div>

      <div className={styles.controls}>
        <label className={styles.ctl}>
          <span>
            NIM staked <b>{nim.toLocaleString('en-US')}</b>
          </span>
          <input
            type="range"
            min={0}
            max={1000}
            value={nimSlider}
            onChange={(e) => setNimSlider(Number(e.target.value))}
          />
          <small>Sets the depth — {slotsFor(nim * 1e5)} places to display something.</small>
        </label>

        <label className={styles.ctl}>
          <span>
            Days staked <b>{days}</b>
          </span>
          <input
            type="range"
            min={1}
            max={MAX_DAY}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
          <small>Fills it — species, numbers, and the odds below.</small>
        </label>
      </div>

      <div className={styles.odds}>
        {(['common', 'uncommon', 'rare', 'legendary'] as const).map((tier) => (
          <div key={tier}>
            <dt>{tier}</dt>
            <dd>{weights[tier].toFixed(1)}%</dd>
          </div>
        ))}
      </div>

      <p className={styles.note}>{nextLine(days)}</p>

      <button className={styles.reseed} onClick={() => setSeed(Math.floor(Math.random() * 1e9))} type="button">
        New seed
      </button>
      <p className={styles.note}>
        Common species look identical for everyone. Press <em>New seed</em> and watch only the rare
        ones change — that uniformity is what makes a rare one legible as rare without a label.
      </p>
    </main>
  );
}
