import type { Plant, SpeciesKey, Tier } from './types';

export interface GuideEntry {
  species: SpeciesKey;
  tier: Tier;
  count: number;
  /** True once discovered; locked species are shown as silhouettes. */
  discovered: boolean;
  unlockDay: number;
  /** How many came up shiny. One in 250, and until now it was never said. */
  shiny: number;
  /**
   * Distinct looks owned, and how many the tier can produce. Both derived from
   * the seed and tier already stored per specimen — the variant collection
   * needed no new storage.
   */
  looks: number;
  looksPossible: number;
}

/** What the client knows about a reef. Shared shape, no server imports. */
export interface ReefState {
  address: string;
  day: number;
  /** Opted out of a public reef page at /r/<address>. */
  hidden: boolean;
  plants: Plant[];

  /** Loyalty. Everything about rarity keys off this, never off amount. */
  daysStaked: number;
  /**
   * The highest streak ever reached. Gates which species can appear, where
   * daysStaked gates how likely each tier is — so a broken streak costs odds,
   * never access.
   */
  peakStreak: number;
  stakedLuna: number;
  delegation: string | null;

  /** Attendance. */
  charges: number;
  maxCharges: number;
  /** ms until the epoch turns, which is when the next charge arrives. */
  nextChargeInMs: number | null;
  epoch: number;
  /** 0..1 through the current epoch, straight from the chain. */
  epochProgress: number;
  /** How long an epoch lasts, so the client can advance the ring itself. */
  epochMs: number;

  /** Money. The only thing stake size governs. */
  plotsUnlocked: number;
  plotsTotal: number;
  freePlots: number[];

  speciesUnlocked: SpeciesKey[];
  next: { atDay: number; species: SpeciesKey; daysAway: number } | null;

  /** Feeding. Day-timed, unlike charges — see docs/SPEC-tank.md. */
  fedToday: boolean;
  /** ms until the UTC day turns and feeding is available again. */
  dayResetsInMs: number;
  /** 0..1 through the UTC day. */
  dayProgress: number;
  feedStreak: number;
  bestStreak: number;
  gaveToday: boolean;
  receivedToday: number;
  receivedLifetime: number;
  givenLifetime: number;

  /** True when the chain could not be read; state comes from history. */
  chainOffline: boolean;
}
