/**
 * Things arrive small and fill out.
 *
 * The tank used to change only when you rolled, so a player out of charges had
 * no reason to open it. Growth is a second, slower clock: the same inhabitants
 * look different in a fortnight.
 *
 * Only the body changes. Species, tier, crest, eyes, mouth and pattern are all
 * fixed at discovery — a fish whose face rearranges itself is not the same
 * fish, and the crest is how rarity is read, so it cannot arrive late.
 */

/** Days to reach full size. */
export const MATURE_DAYS = 21;

/**
 * 0 on arrival, 1 once grown, eased so most of the change is visible in the
 * first week. A linear ramp over three weeks is invisible day to day, which
 * is the same as no growth at all.
 */
export function maturity(ageDays: number, fullDays = MATURE_DAYS): number {
  const t = Math.min(1, Math.max(0, ageDays / fullDays));
  return 1 - (1 - t) * (1 - t);
}

/**
 * Body scale for a fauna specimen. Not smaller than this — a juvenile still
 * has to be recognisable as what it is, and its eye still has to read.
 */
export function faunaScale(ageDays: number): number {
  return FAUNA_FLOOR + (1 - FAUNA_FLOOR) * maturity(ageDays);
}

/** Smallest a fauna specimen is drawn, on the day it is caught. */
export const FAUNA_FLOOR = 0.58;

/**
 * Smallest grass is drawn.
 *
 * Lower than the fauna floor, because a short blade still reads as grass where
 * a tiny shark reads as a bug — but not as low as it first was: at 0.22 a new
 * reef's grass was a few pixels of stubble and read as a rendering fault
 * rather than as a sprout.
 */
export const GRASS_FLOOR = 0.34;

export function grassScale(ageDays: number): number {
  return GRASS_FLOOR + (1 - GRASS_FLOOR) * maturity(ageDays);
}
