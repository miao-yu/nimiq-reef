'use client';

import { useState } from 'react';
import {
  FLOORS,
  WALLS,
  FLOOR_KEYS,
  WALL_KEYS,
  isUnlocked,
  type Unlock,
} from '@/lib/reef/decor';
import { report } from '@/lib/client-log';
import type { ReefState } from '@/lib/reef/state';
import styles from './LookPicker.module.css';

/**
 * The one thing in the app somebody chooses.
 *
 * Everything else about a reef follows from staking and luck. Floors and walls
 * follow from taste, which is what can make a shared picture recognisably
 * theirs rather than a picture of the same game.
 *
 * Locked options stay visible and say what they need. A hidden lock teaches
 * nothing; a lock that names its condition is a reason to come back.
 */
export function LookPicker({
  reef,
  onChange,
}: {
  reef: ReefState;
  onChange: (r: ReefState) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function choose(next: { floor?: string; wall?: string }) {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch('/api/reef/look', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const data = (await res.json().catch(() => ({}))) as { reef?: ReefState; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Could not change the look.');
      if (data.reef) onChange(data.reef);
    } catch (cause) {
      report('look', cause);
      setNote(cause instanceof Error ? cause.message : 'Could not change the look.');
    } finally {
      setBusy(false);
    }
  }

  const row = (
    keys: readonly string[],
    defs: Record<string, Unlock>,
    current: string,
    apply: (key: string) => { floor?: string; wall?: string },
  ) => (
    <div className={styles.row}>
      {keys.map((key) => {
        const def = defs[key]!;
        const open = isUnlocked(def, reef.earned);
        const on = current === key;
        return (
          <button
            key={key}
            className={`${styles.chip} ${on ? styles.on : ''} ${open ? '' : styles.locked}`}
            onClick={() => (open ? void choose(apply(key)) : setNote(`Needs ${def.needs}.`))}
            disabled={busy}
            type="button"
            title={open ? def.blurb : `Needs ${def.needs}`}
          >
            {def.label}
            {open ? null : <span className={styles.lockMark} aria-hidden="true"> ·</span>}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Look</h3>
      <p className={styles.sub}>The floor and the water behind. Yours to pick.</p>

      <span className={styles.label}>Floor</span>
      {row(FLOOR_KEYS, FLOORS, reef.floor, (floor) => ({ floor }))}

      <span className={styles.label}>Behind</span>
      {row(WALL_KEYS, WALLS, reef.wall, (wall) => ({ wall }))}

      {note ? <p className={styles.note}>{note}</p> : null}
    </div>
  );
}
