import { SPECIES, SPECIES_ORDER } from './species';
import { tierWeights } from './progression';
import { LOOKS_PER_TIER, SHINY_ODDS, CREST_CEILING, EYE_COUNT, MOUTH_COUNT, PATTERN_COUNT, traitsFor } from '@/lib/tank/traits';
import type { SpeciesKey, Tier } from './types';

/**
 * One look, addressable.
 *
 * A creature's appearance is a pure function of its species, tier and seed —
 * the same three values the renderer takes — so a look can live at a URL and
 * be redrawn by anybody, with no database read and no session. That is what
 * makes it shareable to somebody who does not play.
 */
export interface Look {
  species: SpeciesKey;
  tier: Tier;
  seed: number;
}

const TIERS: readonly Tier[] = ['common', 'uncommon', 'rare', 'legendary'];

export function parseLook(species: string, tier: string, seed: string): Look | null {
  if (!(species in SPECIES)) return null;
  if (!TIERS.includes(tier as Tier)) return null;
  const n = Number(seed);
  if (!Number.isInteger(n) || n < 0 || n > 2 ** 31) return null;
  return { species: species as SpeciesKey, tier: tier as Tier, seed: n };
}

/**
 * The reference streak the published odds are quoted at.
 *
 * Rarity moves with the staking streak — both which species are in play and
 * how often each tier comes up — so a number with no streak attached would be
 * meaningless. Thirty days is far enough in that every tier is reachable and
 * near enough that most players will recognise it.
 */
export const ODDS_AT_DAY = 30;

/**
 * The parts have names, and the names are what a person sees.
 *
 * "Pattern 6 of 6" read as a score — six out of six — when it meant the sixth
 * of six kinds. Naming them removes the reading entirely.
 */
export const CREST_NAMES = ['None', 'Low', 'Tall', 'Crown', 'Spined', 'Plumed', 'Split', 'Horned'];
export const EYE_NAMES = ['Round', 'Narrow', 'Wide', 'Ringed', 'Half-lidded', 'Bright', 'Dark', 'Flecked'];
export const MOUTH_NAMES = ['Straight', 'Downturned', 'Open', 'Beaked', 'Wide', 'Pursed', 'Hooked'];
export const PATTERN_NAMES = ['Unmarked', 'Banded', 'Spotted', 'Mottled', 'Striped', 'Edged'];

export interface Odds {
  /** Chance the roll lands on this tier at all. */
  tier: number;
  /** …and then on this species within it. */
  species: number;
  /** …and then on this exact combination of parts. One in `oneIn`. */
  look: number;
  oneIn: number;
  /** The same, if it had also come up shiny. */
  shinyOneIn: number;
  looksInTier: number;
  /** How many species of this tier are in play at the quoted streak. */
  speciesInTier: number;
}

export function oddsFor(look: Look, atDay = ODDS_AT_DAY): Odds {
  const weights = tierWeights(atDay);
  const total = TIERS.reduce((sum, t) => sum + weights[t], 0);
  const inTier = SPECIES_ORDER.filter(
    (k) => SPECIES[k].tier === look.tier && SPECIES[k].unlockDay <= atDay,
  ).length;

  const tier = total > 0 ? weights[look.tier] / total : 0;
  const species = inTier > 0 ? tier / inTier : 0;
  const looksInTier = LOOKS_PER_TIER[look.tier];
  const chance = species / looksInTier;

  return {
    tier,
    species,
    look: chance,
    oneIn: chance > 0 ? Math.round(1 / chance) : 0,
    shinyOneIn: chance > 0 ? Math.round(SHINY_ODDS / chance) : 0,
    looksInTier,
    speciesInTier: inTier,
  };
}

/** The parts this look is made of, named, with how many kinds exist of each. */
export function partsOf(look: Look): { label: string; name: string; of: number }[] {
  const t = traitsFor(look.seed, look.tier);
  return [
    { label: 'Crest', name: CREST_NAMES[t.crest] ?? '—', of: CREST_CEILING[look.tier] },
    { label: 'Eyes', name: EYE_NAMES[t.eyes] ?? '—', of: EYE_COUNT },
    { label: 'Mouth', name: MOUTH_NAMES[t.mouth] ?? '—', of: MOUTH_COUNT },
    { label: 'Pattern', name: PATTERN_NAMES[t.pattern] ?? '—', of: PATTERN_COUNT },
  ];
}

export function isShinyLook(look: Look): boolean {
  return traitsFor(look.seed, look.tier).shiny;
}

/**
 * A sentence describing the look, for the page and its share preview.
 *
 * Written from the parts rather than stored, so every one of the tens of
 * thousands of looks has a description without anybody writing them.
 */
export function describeLook(look: Look): string {
  const t = traitsFor(look.seed, look.tier);
  const crest = t.crest === 0 ? 'no crest' : `a ${(CREST_NAMES[t.crest] ?? 'plain').toLowerCase()} crest`;
  const eyes = (EYE_NAMES[t.eyes] ?? 'plain').toLowerCase();
  const pattern = (PATTERN_NAMES[t.pattern] ?? 'marked').toLowerCase();
  const blush = t.blush ? ', flushed at the cheek' : '';
  const body = `${pattern}, with ${crest} and ${eyes} eyes${blush}.`;
  // A sentence, so it reads as one wherever it lands — including an OG preview.
  return t.shiny ? `Shiny, and ${body}` : body.charAt(0).toUpperCase() + body.slice(1);
}
