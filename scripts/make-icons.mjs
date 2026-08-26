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

for (const size of [192, 512]) {
  const c = createCanvas(size, size);
  renderTank(c.getContext('2d'), {
    width: size,
    height: size,
    time: 11.4,
    inhabitants: LIFE.map(([species, tier, seed]) => ({ species, tier, seed })),
    palette: TANK_PALETTE,
    tankFill: 1,
    motion: false,
    scale: size * 0.42,
  });
  writeFileSync(`public/icon-${size}.png`, c.toBuffer('image/png'));
  console.log(`  public/icon-${size}.png`);
}
