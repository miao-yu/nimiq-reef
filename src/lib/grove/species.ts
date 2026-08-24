import type { SpeciesDef, SpeciesKey } from './types';

/**
 * Guardrail: unlockDay is measured in *unbroken days staked*, never in NIM.
 * Growth must not scale with stake size or the grove becomes pay-to-win and a
 * whale flattens it on day one. See docs/DECISIONS.md.
 */
export const SPECIES: Record<SpeciesKey, SpeciesDef> = {
  sprout: { matures: 6, depth: 4, label: 'Sprout', unlockDay: 1 },
  fern: { matures: 14, depth: 2, label: 'Fern', unlockDay: 7 },
  bloom: { matures: 21, depth: 3, label: 'Bloom', unlockDay: 21 },
  elder: { matures: 45, depth: 1, label: 'Elder tree', unlockDay: 60 },
};

export const SPECIES_ORDER: SpeciesKey[] = ['sprout', 'fern', 'bloom', 'elder'];

export function unlockedSpecies(daysStaked: number): SpeciesKey[] {
  return SPECIES_ORDER.filter((k) => daysStaked >= SPECIES[k].unlockDay);
}
