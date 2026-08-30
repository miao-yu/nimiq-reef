/**
 * Plants. Rooted, drawn by flora.ts, and outside the trait system — a sea fan
 * has no eyes to blink and no crest to wear.
 *
 * The renderer used to ask `species === 'grass'` to tell a plant from a fish.
 * That was true exactly as long as there was one plant.
 */
export const FLORA_KEYS = ['grass', 'kelp', 'fan', 'anemone', 'tubeworm'] as const;
export type FloraKey = (typeof FLORA_KEYS)[number];

/** Everything that swims. Has a painter in fauna.ts and wears traits. */
export type FaunaKey = Exclude<SpeciesKey, FloraKey>;

const FLORA_SET: ReadonlySet<string> = new Set(FLORA_KEYS);
export const isFlora = (species: string): species is FloraKey => FLORA_SET.has(species);

export type SpeciesKey =
  | 'grass'
  | 'kelp'
  | 'fan'
  | 'anemone'
  | 'tubeworm'
  | 'guppy'
  | 'seahorse'
  | 'eel'
  | 'angel'
  | 'jelly'
  | 'shrimp'
  | 'shark'
  | 'lionfish'
  | 'ray'
  | 'octopus'
  | 'turtle'
  | 'whale';

export type Tier = 'common' | 'uncommon' | 'rare' | 'legendary';

/** One living thing in a tank. Position is never stored — see motion.ts. */
export interface Inhabitant {
  species: SpeciesKey;
  /** Stable per-specimen seed: colour, size, lean, phase. Never Math.random(). */
  seed: number;
  tier: Tier;
  /** Whole days since discovery. 0 on arrival. */
  ageDays: number;
}

export interface TankPalette {
  waterTop: string;
  waterMid: string;
  waterDeep: string;
  sand: string;
  sandDark: string;
  shaft: string;
  caustic: string;
  glass: string;
  bubble: string;
  plantA: string;
  plantB: string;
  plantC: string;
  room: string;
}

export interface RenderOptions {
  width: number;
  height: number;
  /**
   * Seconds. Motion is a pure function of this, so the server can draw any
   * moment and the phone draws the same one — which is what keeps a shared
   * card identical to what the player was looking at.
   */
  time: number;
  inhabitants: readonly Inhabitant[];
  palette: TankPalette;
  /**
   * How much of the glass holds water, 0..1. The one thing stake amount drives
   * visually — the glass itself is the same size for everyone, and depth never
   * gates what can live in it.
   */
  waterLevel?: number;
  scale?: number;
  /**
   * Where the player last touched the glass, and how recently, 0..1.
   *
   * The one thing here that is *not* a function of time and seed — and so the
   * one thing the server never passes. A share card is drawn with no touch at
   * all, which is exactly why adding this costs nothing: the picture the
   * server renders is still the picture an untouched tank shows.
   */
  touch?: { x: number; y: number; strength: number };
  /**
   * The look the owner chose. Scene only — no creature reads these, which is
   * why a decorated tank is still deterministic.
   */
  floor?: string;
  wall?: string;
  /**
   * Feedings received today. Draws sinking flakes — the one thing in the tank
   * that another person put there, and the only reason to open the app and
   * find it different from how you left it.
   */
  feedings?: number;
  /**
   * false renders a single composed frame with no implied movement. Used for
   * prefers-reduced-motion and for the share card, so it has to look
   * deliberate rather than paused.
   */
  motion?: boolean;
}

/** The tank's rectangle inside the canvas. */
export interface TankRect {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Waterline; everything above it is air. */
  surfaceY: number;
  /** Top of the substrate; plants root here. */
  groundY: number;
}
