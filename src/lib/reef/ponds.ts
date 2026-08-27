import type { TankPalette } from '@/lib/tank/types';
import type { SpeciesKey } from './types';

/**
 * Every elected validator is a pond.
 *
 * Identified the way everything else here is identified — by its identicon and
 * its truncated address. Not by name and logo: of the validators currently
 * elected, roughly half appear in the public registry and half do not, so a
 * name-based list would be half blank. Every address has a face.
 *
 * There is no country. Neither the chain nor the registry carries a location,
 * and inventing one for a real staking business would mean asserting a fact
 * about somebody that we made up.
 *
 * What a pond *does* have is a water type, hashed from its address the same way
 * an identicon is: a name, a palette, and a lean toward certain species.
 */

export type WaterKey = 'shallows' | 'kelp' | 'trench' | 'current' | 'flats' | 'vent';

export interface Water {
  key: WaterKey;
  label: string;
  /** One line, shown under the name. The pond's whole pitch. */
  blurb: string;
  palette: TankPalette;
  /**
   * Species this water favours, as multipliers.
   *
   * **Applied within a tier, never across tiers.** A trench makes a whale the
   * likelier legendary; it does not make a legendary likelier. Tier odds stay a
   * pure function of days staked, because the moment a pond can improve them,
   * picking the right pond replaces loyalty and one pond becomes correct.
   */
  favours: Partial<Record<SpeciesKey, number>>;
}

/**
 * Palettes are hand-authored and chosen by hash — never computed from one.
 * Deriving colour from a hash produces mud: it is exactly how legendary
 * specimens ended up less saturated than rare ones, and that stayed invisible
 * until all four tiers were rendered side by side.
 */
const BASE = {
  sand: '#2C4150',
  sandDark: '#1D2D3A',
  glass: '#B4E1F0',
  bubble: '#C8F0FF',
  room: '#050F16',
} as const;

export const WATERS: Record<WaterKey, Water> = {
  shallows: {
    key: 'shallows',
    label: 'Coral shallows',
    blurb: 'Bright, busy, and shallow enough to see the bottom.',
    palette: {
      ...BASE,
      waterTop: '#37A6BF',
      waterMid: '#1D7C9B',
      waterDeep: '#0E4A66',
      sand: '#3E5568',
      sandDark: '#27394A',
      shaft: '#BDF1FF',
      caustic: '#CFF6FF',
      plantA: '#4FB37A',
      plantB: '#3A8C60',
      plantC: '#79D19C',
    },
    favours: { guppy: 3, angel: 3, shrimp: 2, jelly: 2 },
  },
  kelp: {
    key: 'kelp',
    label: 'Kelp forest',
    blurb: 'Green light, deep cover, and something always moving.',
    palette: {
      ...BASE,
      waterTop: '#2C7A63',
      waterMid: '#1A5245',
      waterDeep: '#0B2C27',
      shaft: '#A8EFC8',
      caustic: '#BDF5D6',
      plantA: '#57A85F',
      plantB: '#3C7A45',
      plantC: '#7FC98A',
    },
    favours: { shrimp: 3, lionfish: 3, turtle: 3, angel: 2 },
  },
  trench: {
    key: 'trench',
    label: 'Deep trench',
    blurb: 'Cold, dark, and very old. Big things live down here.',
    palette: {
      ...BASE,
      waterTop: '#1B3F6E',
      waterMid: '#122A4C',
      waterDeep: '#060F22',
      shaft: '#7FA8E8',
      caustic: '#93B8F0',
      plantA: '#3A6E8F',
      plantB: '#2A5170',
      plantC: '#5C93B4',
    },
    favours: { whale: 4, octopus: 3, ray: 3, jelly: 2 },
  },
  current: {
    key: 'current',
    label: 'Cold current',
    blurb: 'Fast water. Whatever is here is passing through.',
    palette: {
      ...BASE,
      waterTop: '#4A7E96',
      waterMid: '#2F5A70',
      waterDeep: '#152F3F',
      shaft: '#CFE6F2',
      caustic: '#DDEEF7',
      plantA: '#4C8A86',
      plantB: '#376865',
      plantC: '#6FB0AB',
    },
    favours: { shark: 4, ray: 3, jelly: 2, guppy: 2 },
  },
  flats: {
    key: 'flats',
    label: 'Sunlit flats',
    blurb: 'Warm, open and shallow. Easy water.',
    palette: {
      ...BASE,
      waterTop: '#48BFC6',
      waterMid: '#26909C',
      waterDeep: '#125A66',
      shaft: '#D6FBFF',
      caustic: '#E4FDFF',
      plantA: '#63BE84',
      plantB: '#469166',
      plantC: '#8ED9A6',
    },
    favours: { guppy: 3, ray: 3, turtle: 2, angel: 2 },
  },
  vent: {
    key: 'vent',
    label: 'Volcanic vent',
    blurb: 'Warm water off the rock, and nothing else nearby.',
    palette: {
      ...BASE,
      waterTop: '#7A4A52',
      waterMid: '#4E2D38',
      waterDeep: '#241419',
      sand: '#4A3038',
      sandDark: '#2C1B21',
      shaft: '#F2C2A0',
      caustic: '#F8D6BC',
      plantA: '#B06A4A',
      plantB: '#8A4E36',
      plantC: '#D28E68',
    },
    favours: { octopus: 3, lionfish: 3, shrimp: 3, shark: 2 },
  },
};

export const WATER_ORDER: WaterKey[] = ['shallows', 'flats', 'kelp', 'current', 'trench', 'vent'];

/** The same avalanche mix the creature traits use, for the same reason. */
function mix32(n: number): number {
  let x = n >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97) >>> 0;
  return (x ^ (x >>> 15)) >>> 0;
}

function hashAddress(address: string): number {
  let h = 0x811c9dc5;
  const compact = address.replace(/\s+/g, '').toUpperCase();
  for (let i = 0; i < compact.length; i++) {
    h ^= compact.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return mix32(h);
}

/**
 * Adjectives for pond names. Paired with the water's own noun, so a name always
 * agrees with the water it describes — "Slate Trench" is a trench.
 *
 * Names can repeat across the 37 elected validators, and that is fine: the name
 * is flavour and the address underneath is the identity. Guaranteeing
 * uniqueness would mean either a much longer list of increasingly silly words
 * or a number stapled on the end.
 */
const ADJECTIVES = [
  'Quiet', 'Amber', 'Slate', 'Pale', 'Salt', 'Glass', 'Lunar', 'Tidal',
  'Still', 'Bright', 'Iron', 'Ember', 'Hollow', 'Silver', 'Copper', 'Ash',
  'Dusk', 'Drift', 'Low', 'Far', 'Long', 'Old', 'North', 'Marrow',
  'Cinder', 'Hush', 'Mercy', 'Rook', 'Thistle', 'Vane', 'Wren', 'Loom',
];

/** The noun each water contributes to a name. */
const NOUNS: Record<WaterKey, string> = {
  shallows: 'Shallows',
  kelp: 'Kelp',
  trench: 'Trench',
  current: 'Current',
  flats: 'Flats',
  vent: 'Vent',
};

export interface Pond {
  address: string;
  water: Water;
  /** A place name, hashed from the address like everything else here. */
  name: string;
}

/**
 * A pond's character, stable forever.
 *
 * Keyed on the address rather than on anything about the current epoch, so a
 * validator that drops out of the elected set and returns is the same pond it
 * was — the list rotates, the places do not.
 */
export function pondFor(address: string): Pond {
  const h = hashAddress(address);
  const water = WATERS[WATER_ORDER[h % WATER_ORDER.length]!]!;
  // A second, independent stream, so the adjective does not move in lockstep
  // with the water — otherwise every trench would be called the same thing.
  const adjective = ADJECTIVES[mix32(h + 0x5bf03635) % ADJECTIVES.length]!;
  return { address, water, name: `${adjective} ${NOUNS[water.key]}` };
}
