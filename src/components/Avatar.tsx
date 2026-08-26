'use client';

import { useEffect, useRef } from 'react';
import { drawFauna, BODY_LENGTH } from '@/lib/tank/fauna';
import { rng } from '@/lib/tank/rng';
import { TANK_PALETTE } from '@/lib/tank/palette';
import type { SpeciesKey } from '@/lib/tank/types';

/**
 * A reef's avatar: a miniature of its own water, with one inhabitant.
 *
 * Not the Nimiq identicon. That package ships 88KB to a phone for a picture,
 * and its hashToIndices returns null for background and accent — a precision
 * bug on large integers. This reuses the renderer that is already here, costs
 * nothing, and looks like this app rather than like a generic hash blob.
 *
 * Deterministic from the address, so a reef always wears the same face.
 */
type Face = Exclude<SpeciesKey, 'grass'>;
const FACES: Face[] = ['guppy', 'angel', 'jelly', 'shrimp', 'shark', 'lionfish', 'turtle'];

function seedFrom(address: string): number {
  let h = 2166136261;
  for (let i = 0; i < address.length; i++) {
    h ^= address.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function Avatar({ address, size = 40 }: { address: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const seed = seedFrom(address);
    const r = rng(seed);
    const species = FACES[Math.floor(r() * FACES.length)]!;
    const hue = Math.floor(r() * 360);

    // Water, tinted per address so two reefs are told apart at a glance even
    // when they happen to share an inhabitant.
    const water = ctx.createLinearGradient(0, 0, 0, size);
    water.addColorStop(0, `hsl(${(hue + 190) % 360}, 42%, 34%)`);
    water.addColorStop(1, TANK_PALETTE.waterDeep);
    ctx.fillStyle = water;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(size * 0.5, size * 0.52);
    // Normalised so a whale and a guppy fill the circle about equally; at this
    // size the silhouette is the whole signal.
    const scale = (size * 0.62) / (BODY_LENGTH[species] * 100);
    ctx.scale(scale * 100, scale * 100);
    drawFauna(species, {
      ctx,
      L: BODY_LENGTH[species],
      colour: `hsl(${hue}, 62%, 62%)`,
      time: 11.4,
      seed: seed % 100,
      rate: 0,
    });
    ctx.restore();
  }, [address, size]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, borderRadius: '50%', flex: 'none', display: 'block' }}
      role="img"
      aria-label="Your reef's mark"
    />
  );
}
