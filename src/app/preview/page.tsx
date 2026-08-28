'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Stage } from '@/components/Stage';
import { depthForStake, slotsFor } from '@/lib/reef/vessel';
import { SPECIES, SPECIES_ORDER, speciesUnlocked } from '@/lib/reef/species';
import { formatNimShort } from '@/lib/nimiq/policy';
import { useLocale } from '@/lib/i18n';
import type { Inhabitant } from '@/lib/tank/types';
import stage from '@/components/Stage.module.css';
import styles from './page.module.css';

/**
 * The simulator, on the same stage as the real thing.
 *
 * Progression runs to a year, which is right for an asset people stake for
 * years but leaves anybody evaluating the app in a fortnight staring at day
 * one. Two sliders show the whole arc in ten seconds, and it costs almost
 * nothing because the renderer is already fully parametric.
 *
 * The two sliders are the model: money sets the depth and the room, time sets
 * what lives in it. Nothing else is on screen, because everything else was
 * commentary on those two.
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
 */
const PREVIEW_CAP_DAYS = 90;
const LAST_BUILT = Math.max(...SPECIES_ORDER.map((k) => SPECIES[k].unlockDay));
const MAX_DAY = Math.min(PREVIEW_CAP_DAYS, LAST_BUILT);

/** A plausible tank for a given day, not a real one. Deterministic per day. */
function populate(days: number, seed: number): Inhabitant[] {
  return speciesUnlocked(days).flatMap((species, i) => {
    const def = SPECIES[species];
    // Commoner things school; an apex predator does not.
    const count =
      def.tier === 'common' ? 3 : def.tier === 'uncommon' ? 2 : def.tier === 'rare' ? 2 : 1;
    return Array.from({ length: count }, (_, k) => ({
      species,
      tier: def.tier,
      // Assume it was found near its unlock day, so dragging the year forward
      // ages what is already in the tank rather than only adding to it.
      ageDays: Math.max(0, days - def.unlockDay),
      seed: seed + i * 7919 + k * 104729,
    }));
  });
}

export default function Preview() {
  const { t } = useLocale();
  const [days, setDays] = useState(1);
  const [nimSlider, setNimSlider] = useState(0);
  const [seed, setSeed] = useState(20260826);

  // Logarithmic: the interesting range spans four orders of magnitude, and a
  // linear slider would spend nine tenths of its travel above 100k.
  const nim = Math.round(Math.pow(10, 2 + (nimSlider / 1000) * 4));
  const inhabitants = useMemo(() => populate(days, seed), [days, seed]);

  return (
    <Stage
      inhabitants={inhabitants}
      waterLevel={depthForStake(nim * 1e5)}
      label={`A simulated reef after ${days} days staked with ${nim} NIM.`}
    >
      <header className={stage.hud}>
        <div className={styles.head}>
          <Link className={styles.back} href="/">
            ← {t('backToReef')}
          </Link>
          <span className={styles.tag}>Preview — not your reef</span>
        </div>
      </header>

      <div className={styles.dock}>
        <label className={styles.ctl}>
          <span className={styles.row}>
            <span>NIM staked</span>
            <b>{formatNimShort(nim * 1e5)}</b>
          </span>
          <input
            className={styles.slider}
            type="range"
            min={0}
            max={1000}
            value={nimSlider}
            onChange={(e) => setNimSlider(Number(e.target.value))}
            aria-label="NIM staked"
          />
          <small>Depth, and {slotsFor(nim * 1e5)} places to display something.</small>
        </label>

        <label className={styles.ctl}>
          <span className={styles.row}>
            <span>Days staked</span>
            <b>{days}</b>
          </span>
          <input
            className={styles.slider}
            type="range"
            min={1}
            max={MAX_DAY}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Days staked"
          />
          <small>What lives in it, and how likely a rare one is.</small>
        </label>

        <button
          className={styles.reseed}
          onClick={() => setSeed(Math.floor(Math.random() * 1e9))}
          type="button"
        >
          New seed
        </button>
      </div>
    </Stage>
  );
}
