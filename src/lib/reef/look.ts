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
  };
}

/** The parts this look is made of, each as "n of many". */
export function partsOf(look: Look): { label: string; index: number; of: number }[] {
  const t = traitsFor(look.seed, look.tier);
  return [
    { label: 'Crest', index: t.crest + 1, of: CREST_CEILING[look.tier] },
    { label: 'Eyes', index: t.eyes + 1, of: EYE_COUNT },
    { label: 'Mouth', index: t.mouth + 1, of: MOUTH_COUNT },
    { label: 'Pattern', index: t.pattern + 1, of: PATTERN_COUNT },
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
  const crest = ['no crest', 'a low crest', 'a tall crest', 'a crown', 'a spined crest',
                 'a plumed crest', 'a split crest', 'a horned crest'][t.crest] ?? 'a crest';
  const eyes = ['round', 'narrow', 'wide', 'ringed', 'half-lidded',
                'bright', 'dark', 'flecked'][t.eyes] ?? 'plain';
  const pattern = ['unmarked', 'banded', 'spotted', 'mottled', 'striped', 'edged'][t.pattern] ?? 'marked';
  const blush = t.blush ? ', flushed at the cheek' : '';
  const body = `${pattern}, with ${crest} and ${eyes} eyes${blush}.`;
  // A sentence, so it reads as one wherever it lands — including an OG preview.
  return t.shiny ? `Shiny, and ${body}` : body.charAt(0).toUpperCase() + body.slice(1);
}
