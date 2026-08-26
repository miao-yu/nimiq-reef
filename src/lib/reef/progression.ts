import { SPECIES, SPECIES_ORDER } from './species';
import type { SpeciesKey } from './types';

/**
 * How a reef advances.
 *
 * Guardrail: every threshold below is measured in **unbroken days staked**.
 * None of them look at how much NIM is staked. A wallet with 100 NIM and one
 * with 100,000 grow the same garden — the difference shows up in what lands in
 * their wallet, not in what they can plant. See docs/DECISIONS.md.
 */

/** Plots unlock alongside species, so each milestone is felt twice. */
export const PLOT_THRESHOLDS = [0, 1, 3, 7] as const;
export const MAX_PLOTS = PLOT_THRESHOLDS.length;

export function plotsUnlocked(daysStaked: number): number {
  return PLOT_THRESHOLDS.filter((d) => daysStaked >= d).length;
}

export function speciesUnlocked(daysStaked: number): SpeciesKey[] {
  return SPECIES_ORDER.filter((key) => daysStaked >= SPECIES[key].unlockDay);
}

export function canPlant(species: SpeciesKey, daysStaked: number): boolean {
  return daysStaked >= SPECIES[species].unlockDay;
}

/** The next thing to look forward to, or null once everything is unlocked. */
export function nextMilestone(
  daysStaked: number,
): { atDay: number; species: SpeciesKey; daysAway: number } | null {
  const upcoming = SPECIES_ORDER.map((key) => ({ key, at: SPECIES[key].unlockDay }))
    .filter((s) => s.at > daysStaked)
    .sort((a, b) => a.at - b.at)[0];
  if (!upcoming) return null;
  return { atDay: upcoming.at, species: upcoming.key, daysAway: upcoming.at - daysStaked };
}
