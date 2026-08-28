'use client';

import { useEffect } from 'react';
import { Tank } from './Tank';
import type { Inhabitant } from '@/lib/tank/types';
import styles from './Stage.module.css';

/**
 * The screen every tank view is drawn on.
 *
 * A fixed stage with the water behind everything and the controls floating on
 * it — a phone shape, centred on a desktop, because a Mini App stretched to
 * 3440px is neither a game nor a website.
 *
 * Shared by the reef and the preview so the simulator looks like the thing it
 * is simulating. Duplicating this once was already enough to let the two drift.
 */
export function Stage({
  inhabitants,
  waterLevel,
  feedings,
  label,
  children,
}: {
  inhabitants: readonly Inhabitant[];
  waterLevel: number;
  feedings?: number;
  label?: string;
  children: React.ReactNode;
}) {
  /*
   * A game screen is not a document and must never scroll like one. On iOS a
   * page that can scroll even slightly lets Safari retract its toolbar, which
   * changes the visual viewport and moves everything on it.
   *
   * Only while a stage is mounted: /fish and the reef pages are ordinary
   * documents that do need to scroll.
   */
  useEffect(() => {
    document.documentElement.classList.add('stage');
    return () => document.documentElement.classList.remove('stage');
  }, []);

  return (
    <main className={styles.screen}>
      <Tank
        inhabitants={inhabitants}
        waterLevel={waterLevel}
        feedings={feedings}
        label={label}
        className={styles.canvas}
      />
      {/* Type over moving water needs a floor under it. */}
      <div className={styles.topScrim} aria-hidden="true" />
      <div className={styles.bottomScrim} aria-hidden="true" />
      {children}
    </main>
  );
}
