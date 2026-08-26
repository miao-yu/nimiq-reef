import { SPECIES } from './species';
import { resolveSpecies } from '@/lib/tank/adapt';
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
    slot: i,
    x: (i + 0.5) / n,
    species: p.species,
    // Through resolveSpecies, because the community table still holds garden
    // rows — 'fern', 'sprout' — that are not in SPECIES. Indexing it directly
    // returned undefined and took the whole page down with it.
    tier: SPECIES[resolveSpecies(p.species)].tier,
    plantedDay: COMMUNITY_DAY - p.ageDays,
    ageDays: p.ageDays,
    seed: p.seed,
  }));
}

/** Shown until anyone has planted anything — a garden, not an empty field. */
export const SEEDED_COMMUNITY: CommunityPlant[] = [
  { species: 'grass', ageDays: 3, seed: 52 },
  { species: 'guppy', ageDays: 1, seed: 26 },
  { species: 'guppy', ageDays: 2, seed: 31 },
  { species: 'angel', ageDays: 5, seed: 8 },
  { species: 'jelly', ageDays: 6, seed: 63 },
  { species: 'shark', ageDays: 9, seed: 77 },
];
