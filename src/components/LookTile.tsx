'use client';

import { useEffect, useRef } from 'react';
import { drawFauna, BODY_LENGTH, colourFor } from '@/lib/tank/fauna';
import { drawFlora, FLORA_HEIGHT } from '@/lib/tank/flora';
import { TANK_PALETTE } from '@/lib/tank/palette';
import { STILL_TIME } from '@/lib/tank/motion';
import { isFlora } from '@/lib/tank/types';
import type { SpeciesKey, Tier, FaunaKey, FloraKey } from '@/lib/tank/types';
import styles from './LookTile.module.css';

/**
 * One look, drawn on its own.
 *
 * Not a miniature tank. The gallery exists to compare *looks*, so every
 * creature is drawn at the same on-screen length whatever its species —
 * a whale beside a guppy at true scale would be a whale beside a speck — and
 * centred rather than placed, because placeAt spreads things across a tank and
 * a grid of tiles each with the subject somewhere different reads as broken.
 *
 * Still, not animated. A page of these would otherwise run dozens of rAF loops
 * for thumbnails nobody is watching closely.
 */
export function LookTile({
  species,
  tier,
  seed,
  shiny,
  size = 66,
}: {
  species: SpeciesKey;
  tier: Tier;
  seed: number;
  shiny?: boolean;
  size?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = Math.round(size * dpr);
    el.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    if (isFlora(species)) {
      // Anchored to the floor: a sea fan floating in the middle of a square
      // reads as debris rather than a plant.
      drawFlora(
        species as FloraKey,
        ctx,
        size / 2,
        size - 3,
        size * 0.62 * (FLORA_HEIGHT[species as FloraKey] / FLORA_HEIGHT.kelp),
        TANK_PALETTE,
        STILL_TIME,
        seed,
        0.35,
      );
      return;
    }

    const key = species as FaunaKey;
    ctx.save();
    ctx.translate(size / 2, size / 2);
    drawFauna(key, {
      ctx,
      L: size * 0.62,
      colour: colourFor(key, tier, seed),
      tier,
      time: STILL_TIME,
      seed: seed % 100,
      rate: 0,
    });
    ctx.restore();
  }, [species, tier, seed, size]);

  return (
    <span className={`${styles.tile} ${shiny ? styles.shiny : ''}`}>
      <canvas ref={canvas} style={{ width: size, height: size }} />
    </span>
  );
}
