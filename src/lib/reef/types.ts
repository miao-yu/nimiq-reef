export type SpeciesKey = 'sprout' | 'fern' | 'bloom' | 'elder';

export interface SpeciesDef {
  /** Days from planting until fully grown. */
  matures: number;
  /** Paint order — lower draws first, so it sits behind. */
  depth: number;
  label: string;
  /** Unbroken days staked before this species can be planted. */
  unlockDay: number;
}

/** One planted thing. Comes from the server in production. */
export interface Plant {
  /** Horizontal position across the plot, 0..1. */
  x: number;
  species: SpeciesKey;
  /** Day index (relative to the reef's first day) it was planted. */
  plantedDay: number;
  /** Stable per-plant seed so a reef looks identical on every render. */
  seed: number;
}

export interface ReefPalette {
  skyTop: string;
  skyBottom: string;
  soil: string;
  soilDark: string;
  leaf1: string;
  leaf2: string;
  leaf3: string;
  trunk: string;
  bloomA: string;
  bloomB: string;
}

export interface RenderOptions {
  width: number;
  height: number;
  /** Current day of the reef. Plants younger than this are not drawn. */
  day: number;
  plants: readonly Plant[];
  palette: ReefPalette;
  /** Global size multiplier, so small canvases stay legible. */
  scale?: number;
  /**
   * Where the horizon sits, 0..1 from the top. The default suits a phone;
   * a wide share card needs more ground or the plants drown in sky.
   */
  groundRatio?: number;
}
