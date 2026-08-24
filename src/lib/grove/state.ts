import type { Plant, SpeciesKey } from './types';

/** What the client knows about a grove. Shared shape, no server imports. */
export interface GroveState {
  address: string;
  /** Day 1 is the day the grove was created. Growth is measured from here. */
  day: number;
  plants: Plant[];
  /** Unbroken days staked. Everything unlocks off this, never off amount. */
  daysStaked: number;
  stakedLuna: number;
  delegation: string | null;
  plotsUnlocked: number;
  plotsTotal: number;
  freePlots: number[];
  speciesUnlocked: SpeciesKey[];
  next: { atDay: number; species: SpeciesKey; daysAway: number } | null;
  /** True when the chain could not be read; state comes from history. */
  chainOffline: boolean;
}
