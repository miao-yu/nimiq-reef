#!/usr/bin/env node
/**
 * Draw the app icons from the same renderer the app uses, so the icon is a
 * real tank rather than a logo drawn somewhere else that can drift from it.
 */
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { renderTank } from '../.icons/tank/render.js';
import { TANK_PALETTE } from '../.icons/tank/palette.js';
import { drawFauna, colourFor } from '../.icons/tank/fauna.js';

// Grown, not newborn: an icon should show the reef at its best. Passing the
// age explicitly matters — omitting it once made maturity() return NaN and
// every icon came out an empty tank.
const AGE = 60;

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
  const ctx = c.getContext('2d');

  /*
   * A tab favicon is about sixteen usable pixels once the browser is done with
   * it, and renderTank sizes each creature by its species — so a guppy stays a
   * guppy-sized speck however far the scale is pushed. The small sizes get one
   * fish drawn directly, filling the frame. Legible beats representative here.
   */
  if (size <= 64) {
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, TANK_PALETTE.waterTop);
    g.addColorStop(1, TANK_PALETTE.waterDeep);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    const [species, tier, seed] = LIFE[3];
    ctx.save();
    ctx.translate(size / 2, size / 2);
    drawFauna(species, {
      ctx,
      L: size * 0.78,
      colour: colourFor(species, tier, seed),
      tier,
      time: 11.4,
      seed: seed % 100,
      rate: 0,
    });
    ctx.restore();
    writeFileSync(out, c.toBuffer('image/png'));
    console.log(`  ${out} (${size}px)`);
    continue;
  }

  renderTank(ctx, {
    width: size,
    height: size,
    time: 11.4,
    inhabitants: LIFE.map(([species, tier, seed]) => ({ species, tier, seed, ageDays: AGE })),
    palette: TANK_PALETTE,
    waterLevel: 1,
    motion: false,
    scale: size * 0.42,
  });
  writeFileSync(out, c.toBuffer('image/png'));
  console.log(`  ${out} (${size}px)`);
}
