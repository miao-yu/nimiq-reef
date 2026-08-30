/**
 * What a lost cast brings up instead of nothing.
 *
 * The first miss each day is already forgiven, and the strike is a fair
 * two-second window on the whole screen — so this is generosity rather than a
 * fix for something unfair. It exists because a rationed charge returning an
 * empty result is the worst outcome in the game: twelve hours for a blank.
 *
 * Deliberately worth nothing. The moment flotsam buys anything, a miss stops
 * being a miss — and a consolation prize dressed in a win's clothing is the
 * mechanic gambling research calls a loss disguised as a win. Flat copy, no
 * fanfare, nothing to collect.
 */
export const FLOTSAM = [
  'a strand of kelp',
  'an empty shell',
  'a smooth pebble',
  'a piece of driftwood',
  'a clouded bottle',
  'a frond of eelgrass',
] as const;

export type Flotsam = (typeof FLOTSAM)[number];

export function flotsamFor(random: () => number): Flotsam {
  return FLOTSAM[Math.min(FLOTSAM.length - 1, Math.floor(random() * FLOTSAM.length))]!;
}
