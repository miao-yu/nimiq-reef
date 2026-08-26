import { rng } from './rng';
import type { TankPalette, TankRect } from './types';

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
