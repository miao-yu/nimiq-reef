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

function resolve(species: string): SpeciesKey {
  if (species in SPECIES) return species as SpeciesKey;
  return LEGACY[species] ?? 'guppy';
}

export function adaptPlants(
  plants: readonly { species: string; seed: number }[],
): Inhabitant[] {
  return plants.map((p) => {
    const species = resolve(p.species);
    return { species, tier: SPECIES[species].tier as Tier, seed: p.seed };
  });
}
