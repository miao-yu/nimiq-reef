/**
 * How a reef looks, as opposed to what lives in it.
 *
 * The one axis of self-expression in the app. Everything else about a reef is
 * a consequence of staking and luck — this is the only part somebody chooses,
 * which is also what makes a share card recognisably *theirs* rather than a
 * picture of the same game.
 *
 * Deliberately not placement. A creature's position is a function of its seed
 * and the frame time, and keeping it that way is what lets the server draw the
 * same picture the player is looking at. Floors and walls change the scene
 * without touching a single creature, so determinism survives intact.
 *
 * Unlocks read off things a player already has. Nothing here is bought, and
 * nothing here is random: every lock states its own condition, and every
 * condition is something the reef is already counting.
 */

export const FLOOR_KEYS = ['sand', 'rubble', 'seagrass', 'volcanic'] as const;
export const WALL_KEYS = ['open', 'kelp', 'trench', 'reef'] as const;

export type FloorKey = (typeof FLOOR_KEYS)[number];
export type WallKey = (typeof WALL_KEYS)[number];

export interface Unlock {
  label: string;
  blurb: string;
  /** Plain English, shown on the locked option. */
  needs: string;
  /** Distinct species ever discovered. */
  species?: number;
  /** Highest staking streak ever reached — the peak, so a break never relocks. */
  peak?: number;
  /** Shinies ever found. */
  shiny?: number;
}

export const FLOORS: Record<FloorKey, Unlock> = {
  sand: { label: 'Sand', blurb: 'Pale, fine, and easy to keep.', needs: '' },
  rubble: {
    label: 'Rubble',
    blurb: 'Broken shell and old coral.',
    needs: '3 species',
    species: 3,
  },
  seagrass: {
    label: 'Seagrass',
    blurb: 'A meadow rooted in the sand.',
    needs: '8 species',
    species: 8,
  },
  volcanic: {
    label: 'Volcanic',
    blurb: 'Black glass, still warm.',
    needs: 'a 30-day streak',
    peak: 30,
  },
};

export const WALLS: Record<WallKey, Unlock> = {
  open: { label: 'Open water', blurb: 'Nothing behind you but blue.', needs: '' },
  kelp: {
    label: 'Kelp stand',
    blurb: 'Tall shadows at the back of the glass.',
    needs: '5 species',
    species: 5,
  },
  trench: {
    label: 'Trench wall',
    blurb: 'The floor drops away and keeps going.',
    needs: 'a 14-day streak',
    peak: 14,
  },
  reef: {
    label: 'Coral shelf',
    blurb: 'Built by something patient.',
    needs: 'a shiny',
    shiny: 1,
  },
};

export interface Earned {
  species: number;
  peak: number;
  shiny: number;
}

export function isUnlocked(need: Unlock, earned: Earned): boolean {
  if (need.species !== undefined && earned.species < need.species) return false;
  if (need.peak !== undefined && earned.peak < need.peak) return false;
  if (need.shiny !== undefined && earned.shiny < need.shiny) return false;
  return true;
}

/**
 * Fall back rather than refuse.
 *
 * A reef whose look somehow outruns its unlocks — a hand-edited row, a rule
 * tightened later — shows the default instead of erroring. A decoration is
 * never worth a broken tank.
 */
export function floorFor(key: string | null, earned: Earned): FloorKey {
  const k = (FLOOR_KEYS as readonly string[]).includes(key ?? '') ? (key as FloorKey) : 'sand';
  return isUnlocked(FLOORS[k], earned) ? k : 'sand';
}

export function wallFor(key: string | null, earned: Earned): WallKey {
  const k = (WALL_KEYS as readonly string[]).includes(key ?? '') ? (key as WallKey) : 'open';
  return isUnlocked(WALLS[k], earned) ? k : 'open';
}
