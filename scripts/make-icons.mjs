#!/usr/bin/env node
/**
 * Draw the app icons from the same renderer the app uses, so the icon is a
 * real tank rather than a logo drawn somewhere else that can drift from it.
 */
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { renderTank } from '../.icons/tank/render.js';
import { TANK_PALETTE } from '../.icons/tank/palette.js';

const LIFE = [
  ['grass', 'common', 52], ['grass', 'common', 88],
  ['guppy', 'common', 26], ['guppy', 'common', 31],
  ['angel', 'uncommon', 8], ['jelly', 'rare', 63],
];

// 192/512 for the manifest, 180 for iOS home screens, 32 for the browser tab.
const TARGETS = [
  [192, 'public/icon-192.png'],
  [512, 'public/icon-512.png'],
  [180, 'src/app/apple-icon.png'],
  [64, 'src/app/icon.png'],
];

for (const [size, out] of TARGETS) {
  const c = createCanvas(size, size);
  renderTank(c.getContext('2d'), {
    width: size,
    height: size,
    time: 11.4,
    // At 64px a crowded tank is mush; drop to two shapes for the small ones.
    inhabitants: (size <= 64 ? LIFE.slice(2, 5) : LIFE).map(([species, tier, seed]) => ({
      species,
      tier,
      seed,
    })),
    palette: TANK_PALETTE,
    waterLevel: 1,
    motion: false,
    scale: size * 0.42,
  });
  writeFileSync(out, c.toBuffer('image/png'));
  console.log(`  ${out} (${size}px)`);
}
