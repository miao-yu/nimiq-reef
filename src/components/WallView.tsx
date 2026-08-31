'use client';

import { useEffect, useState } from 'react';
import { Tank } from './Tank';
import { adaptPlants } from '@/lib/tank/adapt';
import { depthForStake } from '@/lib/reef/vessel';
import { foodInWater } from '@/lib/reef/feeding';
import { report } from '@/lib/client-log';
import type { PublicReef } from '@/lib/reef/public';
import styles from './WallView.module.css';

/** How often the wall looks for new arrivals. */
const REFRESH_MS = 5 * 60 * 1000;

/**
 * Water level, compressed for a landscape frame.
 *
 * depthForStake spans 0.42 to 1.0, which is right in the phone-shaped Stage
 * and wrong here: on a wide desktop a reef with no stake leaves more than half
 * the screen as pale empty sky, and a wallpaper made mostly of sky is not a
 * reef. The stake still moves the waterline — it just moves it within the top
 * tenth, where it reads as a surface rather than a horizon.
 */
function wallDepth(stakedLuna: number): number {
  return 0.9 + depthForStake(stakedLuna) * 0.1;
}

/**
 * A reef filling the screen, and nothing else.
 *
 * This runs for weeks rather than minutes — it is somebody's wallpaper — so it
 * refreshes its own contents on a slow timer. Without that, a wall set on
 * Monday would still be showing Monday's tank on Friday while its owner had
 * caught a dozen things.
 *
 * Tank already stops its loop when the document is hidden and resizes itself
 * with a ResizeObserver, which is exactly the behaviour a wallpaper wants:
 * no frames burned while the screen is asleep or the window is covered.
 */
export function WallView({ reef, label }: { reef: PublicReef; label: string }) {
  const [live, setLive] = useState(reef);

  useEffect(() => {
    const compact = reef.address.replace(/\s/g, '');
    const tick = () => {
      void fetch(`/api/wall/${compact}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((next: PublicReef | null) => {
          if (next) setLive(next);
        })
        .catch((cause) => {
          // A wall that loses its connection keeps swimming with what it has.
          report('wall:refresh', cause);
        });
    };
    const id = window.setInterval(tick, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [reef.address]);

  return (
    <main className={styles.wall}>
      <Tank
        inhabitants={adaptPlants(live.plants)}
        waterLevel={wallDepth(live.stakedLuna)}
        feedings={foodInWater(live)}
        floor={live.floor}
        wall={live.wall}
        className={styles.canvas}
        label={`${label}'s reef, ${live.plants.length} on display.`}
      />
    </main>
  );
}
