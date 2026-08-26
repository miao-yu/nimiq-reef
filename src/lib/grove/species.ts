import type { SpeciesDef, SpeciesKey } from './types';

/**
 * SUPERSEDED — this file is rewritten in Step 2 of docs/PLAN.md.
 *
 * These thresholds were compressed for the competition window. That was a
 * mistake: it optimised the game for a two-week judging period when the asset
 * it sits on is staked for years. The in-app simulator solves the judging
 * problem instead, and the real ladder now spans days to years.
 *
 * Guardrail: unlockDay is measured in *unbroken days staked*, never in NIM.
 * Growth must not scale with stake size or the grove becomes pay-to-win and a
 * whale flattens it on day one. See docs/DECISIONS.md.
 */
export const SPECIES: Record<SpeciesKey, SpeciesDef> = {
  sprout: { matures: 1, depth: 4, label: 'Sprout', unlockDay: 0 },
  fern: { matures: 2, depth: 2, label: 'Fern', unlockDay: 1 },
  bloom: { matures: 4, depth: 3, label: 'Bloom', unlockDay: 3 },
  elder: { matures: 7, depth: 1, label: 'Elder tree', unlockDay: 7 },
};

export const SPECIES_ORDER: SpeciesKey[] = ['sprout', 'fern', 'bloom', 'elder'];

/** Sprout is available at zero days staked — the free tier must be a real garden. */
export function unlockedSpecies(daysStaked: number): SpeciesKey[] {
  return SPECIES_ORDER.filter((k) => daysStaked >= SPECIES[k].unlockDay);
}
