import type { RenderOptions, TankRect } from './types';

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Where the tank sits inside the canvas.
 *
 * A small stake leaves visible room around the glass; a large one nearly fills
 * the frame. That empty margin is the point — it is what makes a whale's tank
 * read as grand without giving them anything that lives in it.
 */
export function tankRect(options: RenderOptions): TankRect {
  const fill = clamp(options.tankFill ?? 0.5, 0, 1);
  const level = clamp(options.waterLevel ?? 1, 0.25, 1);

  const w = options.width * lerp(0.46, 0.97, fill);
  const h = options.height * lerp(0.52, 0.95, fill);
  const x = (options.width - w) / 2;
  // Sits low in the frame, like a tank on a table rather than floating.
  const y = options.height - h - options.height * 0.025;

  const groundY = y + h * 0.9;
  // Water fills from the substrate up; a withdrawal drops the line, never the
  // floor, so nothing living is ever squeezed out.
  const surfaceY = groundY - (groundY - y) * level;

  return { x, y, w, h, surfaceY, groundY };
}

/**
 * How much of the canvas the tank fills, from the stake.
 *
 * Log scale from the 100 NIM protocol minimum up to a million, because the
 * difference between 100 and 1,000 NIM should be as visible as the difference
 * between 100,000 and a million. A zero stake still gets a real tank — the free
 * tier is a tank, not a locked door.
 */
export function fillForStake(stakedLuna: number): number {
  const nim = stakedLuna / 1e5;
  if (nim <= 0) return 0.34;
  const t = (Math.log10(Math.max(100, Math.min(1e6, nim))) - 2) / 4;
  return 0.4 + t * 0.57;
}
