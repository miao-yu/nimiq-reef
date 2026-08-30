import { rng } from './rng';
import { BODY_LENGTH } from './fauna';
import type { Inhabitant, SpeciesKey, TankRect } from './types';

type Style = 'swim' | 'drift' | 'crawl' | 'glide';

const STYLE: Record<SpeciesKey, Style> = {
  grass: 'crawl',
  kelp: 'crawl',
  fan: 'crawl',
  anemone: 'crawl',
  tubeworm: 'crawl',
  guppy: 'swim',
  // Hovers among the plants rather than commuting.
  seahorse: 'crawl',
  eel: 'swim',
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
  kelp: 0,
  fan: 0,
  anemone: 0,
  tubeworm: 0,
  guppy: 0.075,
  seahorse: 0.014,
  eel: 0.03,
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
/**
 * How a creature answers a finger on the glass.
 *
 * Fixed at spawn from the seed, never rerolled, because a creature that is shy
 * one day and curious the next has no character at all. Three is enough:
 * players name the personalities themselves once the behaviour is consistent.
 */
export type Temperament = 'curious' | 'shy' | 'aloof';

export function temperamentOf(seed: number): Temperament {
  const n = Math.abs(Math.imul(seed ^ 0x5bf03635, 0x27d4eb2d)) % 100;
  if (n < 40) return 'curious';
  if (n < 75) return 'shy';
  return 'aloof';
}

export function placeAt(
  inhabitant: Inhabitant,
  tank: TankRect,
  time: number,
  index: number,
  interest = 0,
  touch?: { x: number; y: number; strength: number },
): Placement {
  const r = rng(inhabitant.seed + index * 7919);
  const style = STYLE[inhabitant.species];
  const depth = 0.55 + r() * 0.45;

  const phase = r() * Math.PI * 2;
  /*
   * A slow wander on the phase, so the path is not a perfect sine.
   *
   * Tremoulet & Feldman (2000) found a single shape reads as *alive* when its
   * speed and heading change together — which a sinusoid already does at each
   * turn, since cos is the derivative of sin and both reverse there. What it
   * does not do is vary: every lap is identical, and identical laps read as
   * machinery. This makes the creature dawdle and hurry on a period unrelated
   * to its own, so the cycle never quite repeats.
   *
   * Still closed-form. Position stays a pure function of time and seed, which
   * is what keeps the server's share card the same picture the player sees.
   */
  const wander = (t: number) => Math.sin(t * 0.13 + phase * 2.7) * 0.42;
  // Nearer things read as faster even at the same real speed.
  const eager = Math.min(1, Math.max(0, interest));
  const speed =
    SPEED[inhabitant.species] * (0.8 + r() * 0.4) * (0.7 + depth * 0.45) * (1 + eager * 0.45);
  const swimmable = tank.groundY - tank.surfaceY;

  /*
   * The finger, applied on top of whatever the closed form decided.
   *
   * Deliberately a nudge and not a destination: creatures lean toward or away
   * and drift back, rather than snapping to the touch. Snapping reads as a
   * cursor dragging objects; leaning reads as something noticing you.
   */
  const nudge = (x: number, y: number): { x: number; y: number } => {
    if (!touch || touch.strength <= 0) return { x, y };
    const temperament = temperamentOf(inhabitant.seed);
    if (temperament === 'aloof') return { x, y };
    const dx = touch.x - x;
    const dy = touch.y - y;
    const distance = Math.hypot(dx, dy) || 1;
    const reach = Math.max(tank.w, tank.h) * 0.55;
    if (distance > reach) return { x, y };
    // Nearer creatures react harder, and the whole thing fades with strength.
    const pull = (1 - distance / reach) * touch.strength * (temperament === 'curious' ? 0.16 : -0.19);
    return { x: x + dx * pull, y: y + dy * pull };
  };

  if (style === 'crawl') {
    // Along the floor, slow, barely leaving the substrate.
    const crawlAngle = time * speed * Math.PI * 2 + phase + wander(time);
    const u = 0.5 + 0.5 * Math.sin(crawlAngle);
    const crawlInset = Math.min(0.3, 0.05 + BODY_LENGTH[inhabitant.species] * 0.19);
    const at = nudge(
      tank.x + tank.w * (crawlInset + u * (1 - crawlInset * 2)),
      tank.groundY - swimmable * (0.03 + r() * 0.05),
    );
    return { x: at.x, y: at.y, dir: Math.cos(crawlAngle) >= 0 ? 1 : -1, depth };
  }

  if (style === 'drift') {
    // Mostly vertical, wandering sideways. A jelly does not commute.
    const rise = 0.5 + 0.5 * Math.sin(time * speed * Math.PI * 2 + phase);
    const at = nudge(
      tank.x + tank.w * (0.12 + r() * 0.76 + Math.sin(time * 0.11 + phase) * 0.05),
      tank.surfaceY + swimmable * (0.1 + rise * 0.62),
    );
    return { x: at.x, y: at.y, dir: 1, depth };
  }

  const angle = time * speed * Math.PI * 2 + phase + wander(time);
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

  const at = nudge(
    tank.x + tank.w * (inset + u * (1 - inset * 2)),
    tank.surfaceY + swimmable * Math.min(0.92, Math.max(0.06, level + bob)),
  );
  return { x: at.x, y: at.y, dir: Math.cos(angle) >= 0 ? 1 : -1, depth };
}
