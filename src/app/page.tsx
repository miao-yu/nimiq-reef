'use client';

import { useState } from 'react';
import { Grove } from '@/components/Grove';
import type { Plant } from '@/lib/grove';
import styles from './page.module.css';

/**
 * Placeholder plot so `npm run dev` shows something real. In the app this
 * comes from the grove engine, derived from the wallet's staking history.
 */
const DEMO_PLOT: Plant[] = [
  { x: 0.075, species: 'sprout', plantedDay: 1, seed: 26 },
  { x: 0.165, species: 'sprout', plantedDay: 1, seed: 14 },
  { x: 0.255, species: 'sprout', plantedDay: 4, seed: 31 },
  { x: 0.375, species: 'fern', plantedDay: 7, seed: 52 },
  { x: 0.525, species: 'elder', plantedDay: 60, seed: 77 },
  { x: 0.645, species: 'bloom', plantedDay: 21, seed: 8 },
  { x: 0.745, species: 'fern', plantedDay: 30, seed: 63 },
  { x: 0.845, species: 'bloom', plantedDay: 45, seed: 45 },
  { x: 0.935, species: 'sprout', plantedDay: 12, seed: 90 },
];

export default function Home() {
  const [day, setDay] = useState(30);

  return (
    <main className={styles.wrap}>
      <div className={styles.head}>
        <h1 className={styles.title}>Nimiq Grove</h1>
        <span className={styles.day}>Day {day}</span>
      </div>

      <div className={styles.canvasFrame}>
        <Grove plants={DEMO_PLOT} day={day} className={styles.canvas} />
      </div>

      <input
        className={styles.slider}
        type="range"
        min={1}
        max={90}
        value={day}
        onChange={(e) => setDay(Number(e.target.value))}
        aria-label="Day of staking"
      />

      <p className={styles.hint}>
        Placeholder plot. Real groves come from the engine on the pool server.
      </p>
    </main>
  );
}
