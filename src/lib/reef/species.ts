import type { SpeciesKey, Tier } from '@/lib/tank/types';

export type { SpeciesKey, Tier };

export interface SpeciesDef {
  label: string;
  tier: Tier;
  /** Unbroken days staked before this species can appear. Never NIM. */
  unlockDay: number;
  /**
   * One line, shown the moment it is landed.
   *
   * Written the way a collectible game writes, not the way a field guide does.
   * This reef was never meant to be realistic, and a paragraph of taxonomy at
   * the exact moment somebody is pleased with themselves is a way to waste it.
   */
  blurb: string;
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
  grass: {
    label: 'Water grass',
    tier: 'common',
    unlockDay: 0,
    blurb: 'Grows quietly and asks for nothing. Everything else builds its life around it.',
  },
  kelp: {
    label: 'Kelp',
    tier: 'common',
    unlockDay: 1,
    blurb: 'Grows toward the light and takes the whole water column with it.',
  },
  fan: {
    label: 'Sea fan',
    tier: 'uncommon',
    unlockDay: 7,
    blurb: 'Stands in the current doing nothing, beautifully, for years.',
  },
  anemone: {
    label: 'Anemone',
    tier: 'rare',
    unlockDay: 21,
    blurb: 'Looks like a flower. Is not one. Will eat whatever it can reach.',
  },
  tubeworm: {
    label: 'Tube worms',
    tier: 'rare',
    unlockDay: 45,
    blurb: 'Built a tube, moved in, and has reconsidered nothing since.',
  },
  guppy: {
    label: 'Guppy',
    tier: 'common',
    unlockDay: 0,
    blurb: 'Small, bright, and completely unbothered. The first friend a reef makes.',
  },
  angel: {
    label: 'Angelfish',
    tier: 'uncommon',
    unlockDay: 2,
    blurb: 'Swims like it knows you are watching. It does.',
  },
  shrimp: {
    label: 'Cleaner shrimp',
    tier: 'uncommon',
    unlockDay: 10,
    blurb: 'Employed. Cleans up after everyone and never once mentions it.',
  },
  jelly: {
    label: 'Jellyfish',
    tier: 'rare',
    unlockDay: 5,
    blurb: 'No brain, no bones, no plans. Has outlasted almost everything that had all three.',
  },
  lionfish: {
    label: 'Lionfish',
    tier: 'rare',
    unlockDay: 30,
    blurb: 'All spines and confidence. Moves slowly because nothing makes it hurry.',
  },
  ray: {
    label: 'Ray',
    tier: 'rare',
    unlockDay: 60,
    blurb: 'Flies more than it swims. Leaves the sand exactly as it found it.',
  },
  shark: {
    label: 'Shark',
    tier: 'legendary',
    unlockDay: 14,
    blurb: 'Older than trees and entirely uninterested in the fact.',
  },
  octopus: {
    label: 'Octopus',
    tier: 'legendary',
    unlockDay: 120,
    blurb: 'Solves problems it was never given. Escapes tanks it was never in.',
  },
  turtle: {
    label: 'Sea turtle',
    tier: 'legendary',
    unlockDay: 240,
    blurb: 'Has been going the same direction for decades and intends to continue.',
  },
  whale: {
    label: 'Whale',
    tier: 'legendary',
    unlockDay: 365,
    blurb: 'A year of staking, swimming. The reef arranges itself around it.',
  },
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
