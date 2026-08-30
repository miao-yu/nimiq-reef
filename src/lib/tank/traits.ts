import type { Tier } from './types';

type Ctx = CanvasRenderingContext2D;

/**
 * What a specimen looks like, decided entirely by its seed.
 *
 * The same idea as a Nimiq identicon: fixed sets per slot, one hash picking
 * from each. Two jobs are kept apart on purpose.
 *
 * **Personality** — eyes, mouth, pattern, blush. No slot is better than any
 * other. A common guppy with a lopsided grin is not a worse pull, it is yours,
 * and that is what stops people releasing everything that is not legendary.
 *
 * **Status** — the crest, gated by tier. Rarity was invisible before this:
 * it lived only in `colourFor`, which nobody can read. A crown means
 * legendary, always, and nothing else ever wears one.
 *
 * Rarity still comes only from days staked. Nothing here can be bought.
 */

export const CREST_COUNT = 8;
export const EYE_COUNT = 8;
export const MOUTH_COUNT = 7;
export const PATTERN_COUNT = 6;

/**
 * How many crests a tier may wear. Higher tiers keep the humbler ones — a
 * legendary is not forbidden a bare head, it is only the tier that *can*
 * wear a crown.
 */
const CREST_CEILING: Record<Tier, number> = {
  common: 2,
  uncommon: 4,
  rare: 7,
  legendary: 8,
};

/** One in this many specimens is shiny, at any tier. */
export const SHINY_ODDS = 250;

export interface Traits {
  crest: number;
  eyes: number;
  mouth: number;
  pattern: number;
  blush: boolean;
  shiny: boolean;
}

/**
 * An avalanche mix, then one independent stream per slot.
 *
 * Deriving slots from successive draws of a plain generator makes neighbouring
 * seeds produce neighbouring creatures — on a contact sheet that showed up
 * immediately as the whole grid sorting itself into colour bands.
 */
function mix32(n: number): number {
  let x = n >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97) >>> 0;
  return (x ^ (x >>> 15)) >>> 0;
}

const slot = (seed: number, index: number, n: number) =>
  mix32(seed + index * 0x9e3779b9) % n;

export function traitsFor(seed: number, tier: Tier): Traits {
  return {
    crest: slot(seed, 3, CREST_CEILING[tier]),
    eyes: slot(seed, 4, EYE_COUNT),
    mouth: slot(seed, 5, MOUTH_COUNT),
    pattern: slot(seed, 6, PATTERN_COUNT),
    blush: slot(seed, 8, 100) < 45,
    shiny: slot(seed, 11, SHINY_ODDS) === 0,
  };
}

/** Darken or lighten a hex or hsl colour by drawing over it. */
function ink(alpha: number): string {
  return `rgba(11,26,34,${alpha})`;
}

/* --------------------------------- parts --------------------------------- */

/**
 * The crest. Anchored at the top of the head, sized to the species so a whale
 * does not wear a guppy's crown.
 */
export function drawCrest(ctx: Ctx, S: number, kind: number, time: number, colour: string): void {
  const bob = Math.sin(time * 2.1) * S * 0.03;
  ctx.save();
  ctx.translate(0, bob);
  // The creature's own colour, not ink. A dark crest against dark water
  // simply is not there — which is how the first pass rendered.
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;

  switch (kind) {
    case 0:
      break;
    case 1: // tuft
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.ellipse(i * S * 0.22, -S * 0.26, S * 0.13, S * 0.3, i * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 2: // spikes
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * S * 0.36 - S * 0.18, 0);
        ctx.lineTo(i * S * 0.36, -S * 0.6);
        ctx.lineTo(i * S * 0.36 + S * 0.18, 0);
        ctx.fill();
      }
      break;
    case 3: // sail
      ctx.beginPath();
      ctx.moveTo(-S * 0.6, 0);
      ctx.quadraticCurveTo(0, -S * 0.9, S * 0.6, 0);
      ctx.fill();
      break;
    case 4: // plume
      ctx.beginPath();
      ctx.moveTo(-S * 0.36, 0);
      ctx.quadraticCurveTo(-S * 0.08, -S * 1.1, S * 0.52, -S * 0.6);
      ctx.quadraticCurveTo(S * 0.06, -S * 0.44, S * 0.36, 0);
      ctx.fill();
      break;
    case 5: // horn
      ctx.beginPath();
      ctx.moveTo(-S * 0.16, 0);
      ctx.quadraticCurveTo(S * 0.08, -S * 0.95, S * 0.38, -S * 0.72);
      ctx.quadraticCurveTo(S * 0.12, -S * 0.36, S * 0.2, 0);
      ctx.fill();
      break;
    case 6: // antennae
      ctx.lineWidth = Math.max(1, S * 0.07);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * S * 0.18, 0);
        ctx.quadraticCurveTo(s * S * 0.38, -S * 0.6, s * S * 0.2, -S * 0.82);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(s * S * 0.2, -S * 0.9, S * 0.11, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    default: // crown — legendary only
      ctx.fillStyle = '#E9B213';
      ctx.beginPath();
      ctx.moveTo(-S * 0.42, 0);
      ctx.lineTo(-S * 0.42, -S * 0.48);
      ctx.lineTo(-S * 0.15, -S * 0.26);
      ctx.lineTo(0, -S * 0.64);
      ctx.lineTo(S * 0.15, -S * 0.26);
      ctx.lineTo(S * 0.42, -S * 0.48);
      ctx.lineTo(S * 0.42, 0);
      ctx.fill();
  }
  ctx.restore();
}

/**
 * One eye, and most of the character in the tank.
 *
 * Oversized, and additively rather than proportionally: a guppy in a
 * phone-sized tank has a two-pixel eye, which is a dot with no expression,
 * while a whale's is already large enough.
 *
 * A pure function of time and seed — the server draws share cards with this
 * same code, and a creature that blinked differently there would not be the
 * same creature.
 */
export function drawEye(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  kind: number,
  time: number,
  seed: number,
): void {
  const R = Math.max(2.4, r * 1.15 + 1.6);

  // Each creature blinks on its own clock, so a tank never blinks in unison.
  const period = 4.1 + (seed % 9) * 0.53;
  const phase = (time + seed * 0.41) % period;
  const CLOSE = 0.16;
  const lid = phase < CLOSE ? 1 - Math.abs(phase - CLOSE / 2) / (CLOSE / 2) : 0;
  const open = Math.max(0.06, 1 - lid * 0.9);
  const gaze = Math.sin(time * 0.47 + seed) * R * 0.16;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, open);

  if (kind === 6) {
    // Content: a closed arc. No white, so it reads as shut rather than blank.
    ctx.strokeStyle = ink(0.92);
    ctx.lineWidth = Math.max(1.2, R * 0.34);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, R * 0.3, R * 0.8, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const big = kind === 1 ? 1.26 : kind === 2 ? 0.84 : 1;

  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath();
  ctx.arc(0, 0, R * big, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = ink(0.92);
  const pupil = kind === 3 ? R * 0.34 : kind === 4 ? R * 0.66 : R * 0.52;
  ctx.beginPath();
  ctx.arc(gaze + R * 0.14, 0, pupil * big, 0, Math.PI * 2);
  ctx.fill();

  // The catchlight, up and left, matching the surface light in the tank.
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.beginPath();
  ctx.arc(gaze - R * 0.2 * big, -R * 0.32 * big, R * 0.25 * big, 0, Math.PI * 2);
  ctx.fill();
  if (kind === 7) {
    ctx.beginPath();
    ctx.arc(gaze + R * 0.3 * big, R * 0.28 * big, R * 0.12 * big, 0, Math.PI * 2);
    ctx.fill();
  }

  if (kind === 5) {
    // Determined: a brow. Drawn as a wedge on its own it read as a black
    // arrow stuck to the fish rather than as an expression.
    ctx.strokeStyle = ink(0.92);
    ctx.lineWidth = Math.max(1.2, R * 0.3);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-R * 0.95, -R * 1.2);
    ctx.lineTo(R * 0.8, -R * 0.62);
    ctx.stroke();
  }
  ctx.restore();
}

/** The mouth, forward and slightly below the eye. */
export function drawMouth(ctx: Ctx, x: number, y: number, s: number, kind: number, time: number): void {
  const chew = 1 + Math.sin(time * 3.4) * 0.2;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = ink(0.88);
  ctx.fillStyle = ink(0.88);
  ctx.lineWidth = Math.max(1, s * 0.16);
  ctx.lineCap = 'round';

  switch (kind) {
    case 0:
      ctx.beginPath();
      ctx.arc(0, -s * 0.25, s * 0.55, 0.25, Math.PI - 0.25);
      ctx.stroke();
      break;
    case 1:
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.32, s * 0.4 * chew, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 2:
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, -s * 0.2);
      ctx.quadraticCurveTo(0, s * 0.55 * chew, s * 0.55, -s * 0.2);
      ctx.closePath();
      ctx.fill();
      break;
    case 3:
      ctx.beginPath();
      ctx.moveTo(-s * 0.45, 0);
      ctx.lineTo(s * 0.4, 0);
      ctx.stroke();
      break;
    case 4:
      ctx.beginPath();
      ctx.arc(0, s * 0.45, s * 0.5, Math.PI + 0.3, -0.3);
      ctx.stroke();
      break;
    case 5:
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.26, s * 0.32 * chew, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    default:
      ctx.beginPath();
      ctx.arc(0, -s * 0.2, s * 0.5, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.fillStyle = '#F2789F';
      ctx.beginPath();
      ctx.ellipse(0, s * 0.32 * chew, s * 0.28, s * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
  }
  ctx.restore();
}

export function drawBlush(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(255,120,140,.32)';
  ctx.beginPath();
  ctx.ellipse(x, y, s * 0.55, s * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Markings, clipped to an ellipse standing in for the body.
 *
 * An approximation on purpose: every species draws its own outline, and
 * clipping to the real path would mean threading it through every painter for
 * a detail that is read at forty pixels wide.
 */
export function drawPattern(
  ctx: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  kind: number,
): void {
  if (kind === 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = ink(0.18);
  ctx.strokeStyle = ink(0.18);

  switch (kind) {
    case 1: // bands
      for (let i = -2; i <= 2; i++) ctx.fillRect(cx + i * rx * 0.38 - rx * 0.07, cy - ry, rx * 0.14, ry * 2);
      break;
    case 2: // spots
      for (let i = 0; i < 7; i++) {
        const a = i * 2.399;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * rx * 0.5, cy + Math.sin(a) * ry * 0.52, rx * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 3: // dorsal wash
      ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 0.8);
      break;
    case 4: // lateral stripe
      ctx.fillRect(cx - rx, cy - ry * 0.18, rx * 2, ry * 0.34);
      break;
    default: // freckles
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(cx + rx * 0.55, cy - ry * 0.2 + i * ry * 0.2, rx * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
  }
  ctx.restore();
}

/**
 * A stable identity for one *look*, so distinct variants can be counted.
 *
 * Shiny is deliberately excluded. It is a colour applied over the same body —
 * see the palette branch in fauna.ts — not a different set of parts, and at
 * 1 in 250 it would otherwise double a denominator that nobody could ever fill.
 * Shinies are counted on their own instead, which is also how players think
 * about them.
 */
export function traitKey(seed: number, tier: Tier): string {
  const t = traitsFor(seed, tier);
  return `${t.crest}.${t.eyes}.${t.mouth}.${t.pattern}.${t.blush ? 1 : 0}`;
}

export function isShiny(seed: number, tier: Tier): boolean {
  return traitsFor(seed, tier).shiny;
}

/**
 * How many distinct looks each tier can produce — the denominator in "47 of N".
 *
 * Computed from the part counts rather than sampled. An earlier measurement
 * over 100k seeds reported lower numbers (1,696 for common); that was how many
 * the sample happened to reach, not how many exist.
 */
export const LOOKS_PER_TIER: Record<Tier, number> = {
  common: CREST_CEILING.common * EYE_COUNT * MOUTH_COUNT * PATTERN_COUNT * 2,
  uncommon: CREST_CEILING.uncommon * EYE_COUNT * MOUTH_COUNT * PATTERN_COUNT * 2,
  rare: CREST_CEILING.rare * EYE_COUNT * MOUTH_COUNT * PATTERN_COUNT * 2,
  legendary: CREST_CEILING.legendary * EYE_COUNT * MOUTH_COUNT * PATTERN_COUNT * 2,
};
