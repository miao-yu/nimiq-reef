import type { Inhabitant, SpeciesKey, Tier } from './types';

/**
 * TEMPORARY — remove in Step 2 of docs/PLAN.md.
 *
 * The database still speaks the garden's vocabulary. This maps it onto tank
 * species so the app becomes an aquarium at the end of Step 1 without waiting
 * for the schema migration. Nothing else should import it.
 */
const FROM_PLANT: Record<string, { species: SpeciesKey; tier: Tier }> = {
  sprout: { species: 'guppy', tier: 'common' },
  fern: { species: 'grass', tier: 'common' },
  bloom: { species: 'angel', tier: 'uncommon' },
  elder: { species: 'whale', tier: 'legendary' },
};

export function adaptPlants(
  plants: readonly { species: string; seed: number }[],
): Inhabitant[] {
  return plants.map((p) => {
    const mapped = FROM_PLANT[p.species] ?? { species: 'guppy' as SpeciesKey, tier: 'common' as Tier };
    return { species: mapped.species, tier: mapped.tier, seed: p.seed };
  });
}
