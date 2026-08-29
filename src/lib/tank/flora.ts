import { rng } from './rng';
import type { FloraKey, TankPalette, TankRect } from './types';

type Ctx = CanvasRenderingContext2D;

/**
 * Water grass. Blades sway on a slow sine, each out of phase with its
 * neighbours — in-phase swaying reads as a single flapping sheet rather than
 * as plants.
 */
export function drawGrass(
  ctx: Ctx,
  x: number,
  groundY: number,
  height: number,
  palette: TankPalette,
  time: number,
  seed: number,
  sway: number,
): void {
  const r = rng(seed);
  const blades = 5 + Math.floor(r() * 3);
  const colours = [palette.plantA, palette.plantB, palette.plantC];

  for (let i = 0; i < blades; i++) {
    const offset = (i - blades / 2) * height * 0.055;
    const bladeH = height * (0.58 + r() * 0.45);
    const phase = r() * Math.PI * 2;
    const bend = Math.sin(time * 0.75 + phase) * height * 0.12 * sway;

    ctx.strokeStyle = colours[i % colours.length]!;
    ctx.globalAlpha = 0.6 + (i % 3) * 0.13;
    ctx.lineWidth = Math.max(1.7, height * 0.032);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + offset, groundY);
    ctx.quadraticCurveTo(
      x + offset + bend * 0.45,
      groundY - bladeH * 0.55,
      x + offset + bend,
      groundY - bladeH,
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Spreads plants evenly along the substrate rather than storing positions. */
export function grassPositions(tank: TankRect, count: number): number[] {
  if (count <= 0) return [];
  return Array.from(
    { length: count },
    (_, i) => tank.x + tank.w * (0.07 + ((i + 0.5) / count) * 0.86),
  );
}

/**
 * Kelp. Taller than grass and slower, because a long frond carries the sway
 * up its whole length rather than flicking at the tip.
 */
export function drawKelp(
  ctx: Ctx, x: number, groundY: number, height: number,
  palette: TankPalette, time: number, seed: number, sway: number,
): void {
  const r = rng(seed);
  const stalks = 2 + Math.floor(r() * 2);
  for (let i = 0; i < stalks; i++) {
    const offset = (i - (stalks - 1) / 2) * height * 0.13;
    const h = height * (0.78 + r() * 0.3);
    const phase = r() * Math.PI * 2;
    const lean = Math.sin(time * 0.45 + phase) * height * 0.16 * sway;
    const colour = i % 2 ? palette.plantB : palette.plantA;

    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = Math.max(1.6, height * 0.026);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + offset, groundY);
    ctx.quadraticCurveTo(x + offset + lean * 0.4, groundY - h * 0.55, x + offset + lean, groundY - h);
    ctx.stroke();

    // Blades sit *along* the stalk and point upward with it. Held out on stalks
    // of their own they read as leaves on a bamboo cane.
    for (let b = 1; b <= 5; b++) {
      const t = b / 6;
      const bx = x + offset + lean * t * t;
      const by = groundY - h * t;
      const side = b % 2 ? 1 : -1;
      ctx.beginPath();
      ctx.ellipse(
        bx + side * height * 0.035,
        by - height * 0.03,
        height * 0.055, height * 0.017,
        side * 1.15, 0, Math.PI * 2,
      );
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * A sea fan. Rigid — it is the one thing on the floor that does not move, and
 * that stillness is what makes everything around it look alive.
 */
export function drawFan(
  ctx: Ctx, x: number, groundY: number, height: number,
  palette: TankPalette, time: number, seed: number, sway: number,
): void {
  const r = rng(seed);
  const h = height * (0.8 + r() * 0.3);
  const spread = h * (0.7 + r() * 0.3);
  const nod = Math.sin(time * 0.3 + seed) * height * 0.02 * sway;
  const RIBS = 9;

  const rib = (t: number) => {
    const tipX = x + (t - 0.5) * spread + nod;
    const tipY = groundY - h * (0.45 + Math.sin(t * Math.PI) * 0.55);
    return { tipX, tipY };
  };

  /*
   * The membrane first. Ribs alone read as a fountain of sticks — it is the
   * webbing between them that makes the silhouette a fan.
   */
  ctx.fillStyle = palette.plantC;
  ctx.globalAlpha = 0.32;
  ctx.beginPath();
  ctx.moveTo(x, groundY);
  for (let i = 0; i < RIBS; i++) {
    const { tipX, tipY } = rib(i / (RIBS - 1));
    ctx.lineTo(tipX, tipY);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = palette.plantC;
  ctx.globalAlpha = 0.95;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.1, height * 0.018);
  for (let i = 0; i < RIBS; i++) {
    const t = i / (RIBS - 1);
    const { tipX, tipY } = rib(t);
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.quadraticCurveTo(x + (tipX - x) * 0.3, groundY - h * 0.5, tipX, tipY);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * An anemone: a squat column under a crown of tentacles that never stop.
 * Its motion is the opposite of the fan's — the column holds, the crown does
 * not.
 */
export function drawAnemone(
  ctx: Ctx, x: number, groundY: number, height: number,
  palette: TankPalette, time: number, seed: number, sway: number,
): void {
  const r = rng(seed);
  const h = height * (0.4 + r() * 0.2);
  const w = height * (0.22 + r() * 0.1);

  ctx.fillStyle = palette.plantB;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.moveTo(x - w, groundY);
  ctx.quadraticCurveTo(x - w * 0.7, groundY - h, x, groundY - h);
  ctx.quadraticCurveTo(x + w * 0.7, groundY - h, x + w, groundY);
  ctx.closePath();
  ctx.fill();

  const arms = 9;
  ctx.strokeStyle = palette.plantC;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.6, height * 0.03);
  for (let i = 0; i < arms; i++) {
    const t = i / (arms - 1);
    const angle = -Math.PI * 0.9 + t * Math.PI * 0.8;
    const len = h * (0.7 + ((i * 37) % 30) / 60);
    const wave = Math.sin(time * 1.4 + i * 0.7 + seed) * height * 0.06 * sway;
    // The control point is pushed sideways of the arm's own direction, so it
    // curls instead of pointing: straight spikes read as a sea urchin.
    const curl = (i % 2 ? 1 : -1) * len * 0.35;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * w * 0.5, groundY - h);
    ctx.quadraticCurveTo(
      x + Math.cos(angle) * len * 0.6 - Math.sin(angle) * curl + wave,
      groundY - h + Math.sin(angle) * len * 0.6 + Math.cos(angle) * curl,
      x + Math.cos(angle) * len + wave * 1.6,
      groundY - h + Math.sin(angle) * len,
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * Tube worms. Hard tubes with a feathery crown that snaps shut and reopens —
 * the only plant here that reacts rather than drifts.
 */
export function drawTubeworm(
  ctx: Ctx, x: number, groundY: number, height: number,
  palette: TankPalette, time: number, seed: number, sway: number,
): void {
  const r = rng(seed);
  const tubes = 3 + Math.floor(r() * 2);
  for (let i = 0; i < tubes; i++) {
    const offset = (i - (tubes - 1) / 2) * height * 0.22;
    const h = height * (0.5 + r() * 0.5);
    const phase = r() * Math.PI * 2;
    // Each worm withdraws on its own slow cycle, so the clump is never uniform.
    const open = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * 0.5 + phase)) * (sway > 0 ? 1 : 0.6);

    ctx.strokeStyle = palette.sandDark;
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = Math.max(3, height * 0.1);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + offset, groundY);
    ctx.lineTo(x + offset, groundY - h);
    ctx.stroke();

    ctx.fillStyle = palette.plantC;
    const crown = height * 0.16 * open;
    for (let f = 0; f < 5; f++) {
      const a = -Math.PI * 0.85 + (f / 4) * Math.PI * 0.7;
      ctx.beginPath();
      ctx.ellipse(
        x + offset + Math.cos(a) * crown,
        groundY - h + Math.sin(a) * crown,
        crown * 0.55, crown * 0.3, a, 0, Math.PI * 2,
      );
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

type FloraPainter = typeof drawGrass;

const FLORA_PAINTERS: Record<FloraKey, FloraPainter> = {
  grass: drawGrass,
  kelp: drawKelp,
  fan: drawFan,
  anemone: drawAnemone,
  tubeworm: drawTubeworm,
};

/**
 * Relative height, so a kelp frond and an anemone are not drawn to the same
 * scale off one number.
 */
export const FLORA_HEIGHT: Record<FloraKey, number> = {
  grass: 1,
  kelp: 1.2,
  fan: 1.1,
  anemone: 0.85,
  tubeworm: 0.95,
};

export function drawFlora(species: FloraKey, ...args: Parameters<FloraPainter>): void {
  FLORA_PAINTERS[species](...args);
}
