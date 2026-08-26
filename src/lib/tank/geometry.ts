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
