import { SPECIES, SPECIES_ORDER, TIER_ORDER, speciesInTier, speciesUnlocked } from './species';
import type { SpeciesKey, Tier } from './types';

/**
 * How a reef advances.
 *
 *   Attendance creates opportunity — a charge is what triggers a roll.
 *   Loyalty creates possibility — days staked set the odds of that roll.
 *   Money creates room — stake size sets how many specimens you can display.
 *
 * Guardrail: **nothing in the rarity path reads the stake amount.** Paying for
 * better odds is a loot box with a price tag, which is the competition's
 * gambling rule and a disqualification rather than a deduction.
 */

/**
 * Rarity anchors from docs/PLAN.md §1, linearly interpolated between rows and
 * held flat past the last one. It approaches a ceiling it never reaches, so a
 * two-year staker stays meaningfully luckier than a three-month staker forever
 * and there is no "maxed out" moment.
 */
const ANCHORS: { day: number; weights: Record<Tier, number> }[] = [
  { day: 0, weights: { common: 92, uncommon: 8, rare: 0, legendary: 0 } },
  { day: 7, weights: { common: 80, uncommon: 17, rare: 3, legendary: 0 } },
  { day: 30, weights: { common: 66, uncommon: 24, rare: 9, legendary: 1 } },
  { day: 90, weights: { common: 55, uncommon: 28, rare: 14, legendary: 3 } },
  { day: 365, weights: { common: 44, uncommon: 30, rare: 20, legendary: 6 } },
  { day: 730, weights: { common: 38, uncommon: 30, rare: 23, legendary: 9 } },
];

export function tierWeights(daysStaked: number): Record<Tier, number> {
  const days = Math.max(0, daysStaked);
  const last = ANCHORS[ANCHORS.length - 1]!;
  if (days >= last.day) return { ...last.weights };

  let lower = ANCHORS[0]!;
  let upper = ANCHORS[0]!;
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    if (days >= ANCHORS[i]!.day && days <= ANCHORS[i + 1]!.day) {
      lower = ANCHORS[i]!;
      upper = ANCHORS[i + 1]!;
      break;
    }
  }
  const span = upper.day - lower.day;
  const t = span === 0 ? 0 : (days - lower.day) / span;
  const out = {} as Record<Tier, number>;
  TIER_ORDER.forEach((tier) => {
    out[tier] = lower.weights[tier] + (upper.weights[tier] - lower.weights[tier]) * t;
  });
  return out;
}

export interface Roll {
  species: SpeciesKey;
  tier: Tier;
}

/**
 * Roll one specimen.
 *
 * Weights are zeroed for any tier with nothing unlocked yet and the rest
 * renormalised, rather than rolling a tier and then failing to fill it. That
 * is what guarantees **every roll produces a specimen** — there is never an
 * empty outcome, which is both the kinder design and what keeps this clear of
 * "games of chance where outcomes are primarily determined by randomness".
 */
export function rollSpecies(daysStaked: number, random: () => number): Roll {
  const weights = tierWeights(daysStaked);
  const available = TIER_ORDER.map((tier) => ({
    tier,
    species: speciesInTier(tier, daysStaked),
    weight: weights[tier],
  })).filter((t) => t.species.length > 0 && t.weight > 0);

  const total = available.reduce((sum, t) => sum + t.weight, 0);

  // Day zero with nothing but commons unlocked still has to yield something.
  if (available.length === 0 || total <= 0) {
    const fallback = speciesUnlocked(daysStaked)[0] ?? 'guppy';
    return { species: fallback, tier: SPECIES[fallback].tier };
  }

  let cursor = random() * total;
  for (const entry of available) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      const species = entry.species[Math.floor(random() * entry.species.length)]!;
      return { species, tier: entry.tier };
    }
  }
  const last = available[available.length - 1]!;
  return { species: last.species[0]!, tier: last.tier };
}


export { depthForStake, slotsFor, vessel } from './vessel';
export { speciesUnlocked, speciesInTier };
export { SPECIES, SPECIES_ORDER, TIER_ORDER } from './species';
export { nextMilestone } from './species';
