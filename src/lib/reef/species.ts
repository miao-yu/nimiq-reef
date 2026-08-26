import type { SpeciesKey, Tier } from '@/lib/tank/types';

export type { SpeciesKey, Tier };

export interface SpeciesDef {
  label: string;
  tier: Tier;
  /** Unbroken days staked before this species can appear. Never NIM. */
  unlockDay: number;
}

/**
 * The ladder. Authoritative copy is docs/PLAN.md §1; keep them in step.
 *
 * It spans days to years on purpose. Nimiq proof-of-stake has run over
 * eighteen months and people stake for years, so a ladder that tops out in a
 * fortnight leaves long-term stakers with nothing — which is what kills
 * collection games.
 *
 * Two deliberate anchors: the **shark at 14 days** stays reachable inside the
 * competition so the app can be seen near its best during judging, and the
 * **whale at 365** is a trophy rather than a milestone. Somebody swimming a
 * whale has genuinely been here a year.
 *
 * Guardrail: every number below is days staked. Nothing here reads the amount.
 */
export const SPECIES: Record<SpeciesKey, SpeciesDef> = {
  grass: { label: 'Water grass', tier: 'common', unlockDay: 0 },
  guppy: { label: 'Guppy', tier: 'common', unlockDay: 0 },
  angel: { label: 'Angelfish', tier: 'uncommon', unlockDay: 2 },
  shrimp: { label: 'Cleaner shrimp', tier: 'uncommon', unlockDay: 10 },
  jelly: { label: 'Jellyfish', tier: 'rare', unlockDay: 5 },
  lionfish: { label: 'Lionfish', tier: 'rare', unlockDay: 30 },
  ray: { label: 'Ray', tier: 'rare', unlockDay: 60 },
  shark: { label: 'Shark', tier: 'legendary', unlockDay: 14 },
  octopus: { label: 'Octopus', tier: 'legendary', unlockDay: 120 },
  turtle: { label: 'Sea turtle', tier: 'legendary', unlockDay: 240 },
  whale: { label: 'Whale', tier: 'legendary', unlockDay: 365 },
};

/** Shallowest first, so listings read as a progression. */
export const SPECIES_ORDER: SpeciesKey[] = (Object.keys(SPECIES) as SpeciesKey[]).sort(
  (a, b) => SPECIES[a].unlockDay - SPECIES[b].unlockDay,
);

export const TIER_ORDER: Tier[] = ['common', 'uncommon', 'rare', 'legendary'];

export function speciesUnlocked(daysStaked: number): SpeciesKey[] {
  return SPECIES_ORDER.filter((key) => daysStaked >= SPECIES[key].unlockDay);
}

export function speciesInTier(tier: Tier, daysStaked: number): SpeciesKey[] {
  return speciesUnlocked(daysStaked).filter((key) => SPECIES[key].tier === tier);
}

/** The next thing to look forward to, or null once everything is unlocked. */
export function nextMilestone(
  daysStaked: number,
): { atDay: number; species: SpeciesKey; daysAway: number } | null {
  const upcoming = SPECIES_ORDER.find((key) => SPECIES[key].unlockDay > daysStaked);
  if (!upcoming) return null;
  const atDay = SPECIES[upcoming].unlockDay;
  return { atDay, species: upcoming, daysAway: atDay - daysStaked };
}
