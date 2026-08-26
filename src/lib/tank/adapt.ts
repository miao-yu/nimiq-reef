import { SPECIES } from '@/lib/reef/species';
import type { Inhabitant, SpeciesKey, Tier } from './types';

/**
 * Rows written before the aquarium existed still hold garden species. New rows
 * hold real ones, so this passes those straight through and only translates
 * the legacy four.
 *
 * Delete once Step 3 replaces `plants` with `specimens` and the old rows are
 * gone — at which point nothing needs translating.
 */
const LEGACY: Record<string, SpeciesKey> = {
  sprout: 'guppy',
  fern: 'grass',
  bloom: 'angel',
  elder: 'shark',
};

export function resolveSpecies(species: string): SpeciesKey {
  if (species in SPECIES) return species as SpeciesKey;
  return LEGACY[species] ?? 'guppy';
}

export function adaptPlants(
  plants: readonly { species: string; seed: number; tier?: Tier; ageDays?: number }[],
): Inhabitant[] {
  return plants.map((p) => {
    const species = resolveSpecies(p.species);
    return {
      species,
      // The specimen's own tier. Falling back to the species default is only
      // for legacy rows that predate the column — for anything current it
      // would hide earned crowns and hand out unearned ones.
      tier: p.tier ?? (SPECIES[species].tier as Tier),
      ageDays: p.ageDays ?? 0,
      seed: p.seed,
    };
  });
}
