import type { Plant, SpeciesKey, Tier } from './types';

export interface GuideEntry {
  species: SpeciesKey;
  tier: Tier;
  count: number;
  /** True once discovered; locked species are shown as silhouettes. */
  discovered: boolean;
  unlockDay: number;
}

/** What the client knows about a reef. Shared shape, no server imports. */
export interface ReefState {
  address: string;
  /** Never a wallet in a payload a stranger can read. */
  handle: string;
  day: number;
  plants: Plant[];

  /** Loyalty. Everything about rarity keys off this, never off amount. */
  daysStaked: number;
  stakedLuna: number;
  delegation: string | null;

  /** Attendance. */
  charges: number;
  maxCharges: number;
  nextChargeInMs: number | null;

  /** Money. The only thing stake size governs. */
  plotsUnlocked: number;
  plotsTotal: number;
  freePlots: number[];

  speciesUnlocked: SpeciesKey[];
  next: { atDay: number; species: SpeciesKey; daysAway: number } | null;

  /** Feeding. */
  fedToday: boolean;
  feedStreak: number;
  bestStreak: number;
  gaveToday: boolean;
  receivedToday: number;
  receivedLifetime: number;
  givenLifetime: number;

  /** True when the chain could not be read; state comes from history. */
  chainOffline: boolean;
}
