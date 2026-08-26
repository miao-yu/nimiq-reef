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
  const level = clamp(options.waterLevel ?? 1, 0.18, 1);

  // Everybody gets the same glass. An earlier version scaled the box with the
  // stake, which spent a newcomer's most valuable pixels on empty room at
  // exactly the moment the app is trying to earn their attention — and it was
  // a second visual for a number the water level already carries.
  const w = options.width * 0.97;
  const h = options.height * 0.95;
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
 * How deep the water sits, from the stake. The one thing amount governs
 * visually — the glass is the same size for everyone.
 *
 * Log scale from the 100 NIM protocol minimum up to a million, because the
 * step from 100 to 1,000 NIM should read as clearly as the step from 100,000
 * to a million. A zero stake still gets real water: the free tier is a tank,
 * not a locked door.
 *
 * Depth is deliberately **not** a gate on which species can live there. "A
 * whale needs deep water" is intuitive and wrong for us — it would stop a
 * year-long small staker from displaying the whale they earned, which is
 * punishing loyalty for poverty.
 */
export function depthForStake(stakedLuna: number): number {
  const nim = stakedLuna / 1e5;
  if (nim <= 0) return 0.42;
  const t = (Math.log10(Math.max(100, Math.min(1e6, nim))) - 2) / 4;
  return 0.55 + t * 0.45;
}
