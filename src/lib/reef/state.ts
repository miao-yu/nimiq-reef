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
  day: number;
  plants: Plant[];

  /** Loyalty. Everything about rarity keys off this, never off amount. */
  daysStaked: number;
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
