import { writeFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import { renderTank } from '../.icons/tank/render.js';
import { TANK_PALETTE } from '../.icons/tank/palette.js';

const life = [
  ['grass', 'common', 12], ['grass', 'common', 44],
  ['guppy', 'common', 7], ['guppy', 'uncommon', 21], ['angel', 'rare', 33],
  ['jelly', 'uncommon', 9], ['turtle', 'rare', 5],
].map(([species, tier, seed]) => ({ species, tier, seed }));

const W = 420, H = 300;
const c = createCanvas(W * 2 + 24, H);
const ctx = c.getContext('2d');
ctx.fillStyle = '#111'; ctx.fillRect(0, 0, c.width, c.height);

[0, 3].forEach((feedings, i) => {
  const t = createCanvas(W, H);
  renderTank(t.getContext('2d'), {
    width: W, height: H, time: 9.4, inhabitants: life,
    palette: TANK_PALETTE, waterLevel: 0.8, feedings,
  });
  ctx.drawImage(t, i * (W + 24), 0);
});
writeFileSync('.render/flakes.png', c.toBuffer('image/png'));
console.log('wrote .render/flakes.png — left: not fed, right: fed 3x');
