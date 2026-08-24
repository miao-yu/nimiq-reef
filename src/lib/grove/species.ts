import type { SpeciesDef, SpeciesKey } from './types';

/**
 * Timescale is set for the competition, not for a hypothetical forever-game.
 * The cycle runs 24 Aug – 18 Sep; a council member signing in on the 20th with
 * thresholds of 7/21/60 would see day one — one plot, one sprout — and nothing
 * else, which is the worst version of the app that exists. At 1/3/7 someone who
 * stakes during early-access week has the whole grove before judging closes.
 *
 * `matures` is compressed to match: a plant that takes 45 days to fill out is
 * a plant nobody in this competition ever sees grown.
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
