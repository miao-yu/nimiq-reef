import type { Plant, SpeciesKey } from './types';

/** A fixed "today" for the community view; ages are measured back from it. */
export const COMMUNITY_DAY = 400;

export interface CommunityPlant {
  species: SpeciesKey;
  ageDays: number;
  seed: number;
}

/**
 * Lay the community's plants out across one canvas.
 *
 * Positions are assigned here rather than stored, so the strip stays evenly
 * spread however many plants come back — and a reef with three plants does
 * not leave a gap where somebody else's used to be.
 */
export function layoutCommunity(plants: readonly CommunityPlant[]): Plant[] {
  const n = plants.length;
  if (n === 0) return [];
  return plants.map((p, i) => ({
    x: (i + 0.5) / n,
    species: p.species,
    plantedDay: COMMUNITY_DAY - p.ageDays,
    seed: p.seed,
  }));
}

/** Shown until anyone has planted anything — a garden, not an empty field. */
export const SEEDED_COMMUNITY: CommunityPlant[] = [
  { species: 'sprout', ageDays: 1, seed: 26 },
  { species: 'fern', ageDays: 3, seed: 52 },
  { species: 'bloom', ageDays: 5, seed: 8 },
  { species: 'elder', ageDays: 9, seed: 77 },
  { species: 'sprout', ageDays: 2, seed: 31 },
  { species: 'fern', ageDays: 6, seed: 63 },
];
