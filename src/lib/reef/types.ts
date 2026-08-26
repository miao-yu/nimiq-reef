import type { SpeciesKey, Tier } from '@/lib/tank/types';

/**
 * Game-side types. Drawing types live in `@/lib/tank` and are not duplicated
 * here — a second copy of SpeciesKey is exactly what let the garden ladder and
 * the aquarium ladder disagree.
 */
export type { SpeciesKey, Tier };

/**
 * One thing living in a reef.
 *
 * Still called a plant in the database until Step 3 replaces the table with
 * `specimens`; the shape is otherwise already what a specimen needs.
 */
export interface Plant {
  /** Which display slot it occupies. Unique per reef. */
  slot: number;
  /** Horizontal position across the tank, 0..1. Assigned on read. */
  x: number;
  species: SpeciesKey;
  /**
   * The tier it was actually rolled at — not the species' nominal tier.
   *
   * These differ: rollSpecies can hand you a legendary guppy or a common
   * shark. Substituting the species default (which is what happened before
   * this field existed) both hid earned crowns and handed out unearned ones.
   */
  tier: Tier;
  /** Day index, relative to the reef's first day, when it arrived. */
  plantedDay: number;
  /** Whole days since discovery. Drives growth; 0 on the day it arrived. */
  ageDays: number;
  /** Stable per-specimen seed: colour, size, phase. Never Math.random(). */
  seed: number;
}
