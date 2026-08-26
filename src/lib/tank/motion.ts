import { rng } from './rng';
import { BODY_LENGTH } from './fauna';
import type { Inhabitant, SpeciesKey, TankRect } from './types';

type Style = 'swim' | 'drift' | 'crawl' | 'glide';

const STYLE: Record<SpeciesKey, Style> = {
  grass: 'crawl',
  guppy: 'swim',
  angel: 'swim',
  lionfish: 'swim',
  shark: 'swim',
  jelly: 'drift',
  shrimp: 'crawl',
  octopus: 'crawl',
  ray: 'glide',
  turtle: 'glide',
  whale: 'glide',
};

/** Tank widths per second. Small fish dart; a whale crosses in about a minute. */
const SPEED: Record<SpeciesKey, number> = {
  grass: 0,
  guppy: 0.075,
  shrimp: 0.02,
  angel: 0.05,
  jelly: 0.012,
  lionfish: 0.04,
  ray: 0.03,
  shark: 0.036,
  octopus: 0.016,
  turtle: 0.026,
  whale: 0.017,
};

export interface Placement {
  x: number;
  y: number;
  /** +1 facing right. */
  dir: 1 | -1;
  /** 0 far, 1 near. Drives size and haze. */
  depth: number;
}

/** A still frame is evaluated here — chosen because it spreads things out. */
export const STILL_TIME = 11.4;

/**
 * Where something is at a given moment.
 *
 * Pure: position is a function of (seed, time), never integrated state. That is
 * what lets the server draw the exact frame the phone drew, and it means a
 * resized canvas or a remounted component never teleports a fish.
 *
 * Horizontal travel uses a sine rather than a triangle wave, so a fish
 * decelerates into the glass, turns, and accelerates away — which is what an
 * actual fish does. A triangle wave snaps direction at full speed and reads
 * as a bouncing sprite.
 *
 * `interest` is 0..1 and says how much food is in the water. It pulls swimmers
 * toward the surface, where the flakes are, and speeds them up a little. It
 * does not move crawlers or drifters — a shrimp does not race a guppy to the
 * top, and a jelly does not care.
 */
export function placeAt(
  inhabitant: Inhabitant,
  tank: TankRect,
  time: number,
  index: number,
  interest = 0,
): Placement {
  const r = rng(inhabitant.seed + index * 7919);
  const style = STYLE[inhabitant.species];
  const depth = 0.55 + r() * 0.45;

  const phase = r() * Math.PI * 2;
  // Nearer things read as faster even at the same real speed.
  const eager = Math.min(1, Math.max(0, interest));
  const speed =
    SPEED[inhabitant.species] * (0.8 + r() * 0.4) * (0.7 + depth * 0.45) * (1 + eager * 0.45);
  const swimmable = tank.groundY - tank.surfaceY;

  if (style === 'crawl') {
    // Along the floor, slow, barely leaving the substrate.
    const u = 0.5 + 0.5 * Math.sin(time * speed * Math.PI * 2 + phase);
    const crawlInset = Math.min(0.3, 0.05 + BODY_LENGTH[inhabitant.species] * 0.19);
    return {
      x: tank.x + tank.w * (crawlInset + u * (1 - crawlInset * 2)),
      y: tank.groundY - swimmable * (0.03 + r() * 0.05),
      dir: Math.cos(time * speed * Math.PI * 2 + phase) >= 0 ? 1 : -1,
      depth,
    };
  }

  if (style === 'drift') {
    // Mostly vertical, wandering sideways. A jelly does not commute.
    const rise = 0.5 + 0.5 * Math.sin(time * speed * Math.PI * 2 + phase);
    return {
      x: tank.x + tank.w * (0.12 + r() * 0.76 + Math.sin(time * 0.11 + phase) * 0.05),
      y: tank.surfaceY + swimmable * (0.1 + rise * 0.62),
      dir: 1,
      depth,
    };
  }

  const angle = time * speed * Math.PI * 2 + phase;
  const u = 0.5 + 0.5 * Math.sin(angle);
  // Keep a body's whole length inside the glass. Without this a whale swims
  // half out of frame, which is most obvious on the share card — and a whale
  // cannot put its nose through the side of a tank anyway.
  const inset = Math.min(0.34, 0.04 + BODY_LENGTH[inhabitant.species] * 0.19);
  const band = style === 'glide' ? 0.16 + r() * 0.5 : 0.1 + r() * 0.66;
  const bob = Math.sin(time * (style === 'glide' ? 0.3 : 0.75) + phase) * (style === 'glide' ? 0.05 : 0.035);

  // Toward the food, not all the way to it: a tank where every fish pins
  // itself to the surface reads as distress, not as feeding time.
  const rise = eager * 0.55;
  const level = band * (1 - rise) + 0.1 * rise;

  return {
    x: tank.x + tank.w * (inset + u * (1 - inset * 2)),
    y: tank.surfaceY + swimmable * Math.min(0.92, Math.max(0.06, level + bob)),
    dir: Math.cos(angle) >= 0 ? 1 : -1,
    depth,
  };
}
