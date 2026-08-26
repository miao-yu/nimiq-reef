import { rng } from './rng';
import type { SpeciesKey, Tier } from './types';

type Ctx = CanvasRenderingContext2D;

/**
 * Relative body length. A whale is not a big guppy — the size gap has to be
 * obvious at a glance or the ladder stops feeling like progress.
 */
export const BODY_LENGTH: Record<SpeciesKey, number> = {
  grass: 0,
  guppy: 0.2,
  shrimp: 0.16,
  angel: 0.3,
  jelly: 0.26,
  lionfish: 0.34,
  ray: 0.52,
  shark: 0.62,
  octopus: 0.44,
  turtle: 0.46,
  whale: 1,
};

/** Tail beat, in radians per second. Small fish flick; a whale barely moves. */
export const TAIL_RATE: Record<SpeciesKey, number> = {
  grass: 0,
  guppy: 5.6,
  shrimp: 6.4,
  angel: 4.2,
  jelly: 1.9,
  lionfish: 3.4,
  ray: 1.6,
  shark: 2.8,
  octopus: 2.2,
  turtle: 1.8,
  whale: 1.05,
};

const COMMON_COLOUR: Partial<Record<SpeciesKey, string>> = {
  guppy: '#E9A13B',
  shrimp: '#E2705C',
};

const UNCOMMON_MORPHS = ['#D9CE5E', '#E08A6A', '#8FD1C4'];

/**
 * Colour by tier, which is the whole rarity read.
 *
 * Common is **identical for everyone** — that uniformity is what makes a rare
 * one legible as rare without printing a label on it. Variation widens as the
 * tier climbs.
 */
export function colourFor(species: SpeciesKey, tier: Tier, seed: number): string {
  const r = rng(seed);
  if (tier === 'common') return COMMON_COLOUR[species] ?? '#8FB4C4';
  if (tier === 'uncommon') return UNCOMMON_MORPHS[Math.floor(r() * UNCOMMON_MORPHS.length)]!;
  const hue = Math.floor(r() * 360);
  if (tier === 'rare') return `hsl(${hue}, ${(58 + r() * 30).toFixed(0)}%, ${(58 + r() * 14).toFixed(0)}%)`;
  return `hsl(${hue}, ${(24 + r() * 20).toFixed(0)}%, ${(50 + r() * 14).toFixed(0)}%)`;
}

/** Shared crescent/fan tail. `wag` is the vertical offset of the trailing edge. */
function tail(ctx: Ctx, len: number, spread: number, wag: number): void {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-len * 0.6, wag * 0.4, -len, wag - spread * 0.5);
  ctx.lineTo(-len, wag + spread * 0.5);
  ctx.quadraticCurveTo(-len * 0.6, wag * 0.4, 0, 0);
  ctx.closePath();
  ctx.fill();
}

function eye(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.fillStyle = 'rgba(255,255,255,.93)';
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1.3, r), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(9,20,28,.9)';
  ctx.beginPath();
  ctx.arc(x + r * 0.22, y, Math.max(0.7, r * 0.5), 0, Math.PI * 2);
  ctx.fill();
}

interface Args {
  ctx: Ctx;
  /** Body length in pixels. */
  L: number;
  colour: string;
  /** Seconds. */
  time: number;
  seed: number;
  rate: number;
}

function guppy({ ctx, L, colour, time, rate, seed }: Args): void {
  const H = L * 0.44;
  const wag = Math.sin(time * rate + seed) * L * 0.14;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(0, 0, L * 0.5, H * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(-L * 0.42, 0);
  tail(ctx, L * 0.34, H * 1.05, wag);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(L * 0.06, -H * 0.42);
  ctx.lineTo(-L * 0.06, -H * 0.9);
  ctx.lineTo(-L * 0.2, -H * 0.38);
  ctx.closePath();
  ctx.fill();
  eye(ctx, L * 0.3, -H * 0.12, L * 0.055);
}

function angel({ ctx, L, colour, time, rate, seed }: Args): void {
  const H = L * 0.92;
  const wag = Math.sin(time * rate + seed) * L * 0.1;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(0, 0, L * 0.42, H * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // The trailing dorsal and anal fins are the whole silhouette.
  [-1, 1].forEach((s) => {
    ctx.beginPath();
    ctx.moveTo(L * 0.12, s * H * 0.4);
    ctx.quadraticCurveTo(-L * 0.15, s * H * 1.15, -L * 0.55, s * H * 1.0 + wag);
    ctx.quadraticCurveTo(-L * 0.2, s * H * 0.62, -L * 0.26, s * H * 0.3);
    ctx.closePath();
    ctx.fill();
  });
  ctx.save();
  ctx.translate(-L * 0.36, 0);
  tail(ctx, L * 0.24, H * 0.5, wag);
  ctx.restore();
  eye(ctx, L * 0.26, -H * 0.14, L * 0.05);
}

function jelly({ ctx, L, colour, time, rate, seed }: Args): void {
  const pulse = 1 + Math.sin(time * rate + seed) * 0.14;
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(0, 0, L * 0.44 * pulse, (L * 0.38) / pulse, 0, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(1, L * 0.035);
  for (let i = 0; i < 5; i++) {
    const tx = (i - 2) * L * 0.14;
    ctx.beginPath();
    ctx.moveTo(tx, 0);
    ctx.quadraticCurveTo(
      tx + Math.sin(time * 1.6 + i + seed) * L * 0.12,
      L * 0.36,
      tx + Math.sin(time * 1.25 + i + seed) * L * 0.2,
      L * 0.7,
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function shrimp({ ctx, L, colour, time, rate, seed }: Args): void {
  const curl = Math.sin(time * rate + seed) * 0.16;
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineWidth = L * 0.3;
  ctx.beginPath();
  ctx.moveTo(L * 0.34, 0);
  ctx.quadraticCurveTo(0, L * (0.12 + curl), -L * 0.34, L * (0.3 + curl));
  ctx.stroke();
  ctx.lineWidth = Math.max(0.8, L * 0.05);
  [0.2, 0.35].forEach((a) => {
    ctx.beginPath();
    ctx.moveTo(L * 0.34, -L * 0.04);
    ctx.quadraticCurveTo(L * 0.6, -L * a, L * 0.85, -L * (a * 0.6));
    ctx.stroke();
  });
  eye(ctx, L * 0.3, -L * 0.08, L * 0.06);
}

function sleek({ ctx, L, colour, time, rate, seed }: Args, dorsal: number, snout: number): void {
  const H = L * 0.4;
  const wag = Math.sin(time * rate + seed) * L * 0.12;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(L * (0.5 + snout), 0);
  ctx.quadraticCurveTo(L * 0.1, -H * 0.66, -L * 0.34, -H * 0.3);
  ctx.quadraticCurveTo(-L * 0.44, 0, -L * 0.34, H * 0.3);
  ctx.quadraticCurveTo(L * 0.1, H * 0.7, L * (0.5 + snout), 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(L * 0.02, -H * 0.5);
  ctx.lineTo(-L * 0.1, -H * dorsal);
  ctx.lineTo(-L * 0.2, -H * 0.46);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(L * 0.06, H * 0.3);
  ctx.lineTo(-L * 0.14, H * 0.95);
  ctx.lineTo(-L * 0.18, H * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.translate(-L * 0.34, 0);
  tail(ctx, L * 0.3, H * 1.5, wag);
  ctx.restore();
  eye(ctx, L * 0.34, -H * 0.16, L * 0.045);
}

function lionfish(a: Args): void {
  const { ctx, L, colour, time, rate, seed } = a;
  const H = L * 0.5;
  // Spines first, so the body sits over their roots.
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(1, L * 0.035);
  ctx.lineCap = 'round';
  for (let i = 0; i < 11; i++) {
    const ang = -Math.PI * 0.85 + (i / 10) * Math.PI * 1.7;
    const sway = Math.sin(time * rate * 0.5 + i * 0.6 + seed) * 0.1;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(
      Math.cos(ang + sway) * L * 0.4,
      Math.sin(ang + sway) * H * 0.9,
      Math.cos(ang + sway) * L * 0.78,
      Math.sin(ang + sway) * H * 1.6,
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(0, 0, L * 0.4, H * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  eye(ctx, L * 0.24, -H * 0.14, L * 0.05);
}

function ray({ ctx, L, colour, time, rate, seed }: Args): void {
  const flap = Math.sin(time * rate + seed);
  ctx.fillStyle = colour;
  // A flattened diamond seen from slightly above; the wings beat vertically.
  ctx.beginPath();
  ctx.moveTo(L * 0.42, 0);
  ctx.quadraticCurveTo(0, -L * (0.16 + flap * 0.1), -L * 0.42, -L * 0.3 * (1 + flap * 0.25));
  ctx.quadraticCurveTo(-L * 0.2, 0, -L * 0.42, L * 0.3 * (1 - flap * 0.25));
  ctx.quadraticCurveTo(0, L * (0.16 - flap * 0.1), L * 0.42, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(1, L * 0.03);
  ctx.beginPath();
  ctx.moveTo(-L * 0.36, 0);
  ctx.quadraticCurveTo(-L * 0.7, flap * L * 0.08, -L * 0.95, flap * L * 0.14);
  ctx.stroke();
  eye(ctx, L * 0.24, -L * 0.06, L * 0.04);
}

function octopus({ ctx, L, colour, time, rate, seed }: Args): void {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(L * 0.12, -L * 0.1, L * 0.32, L * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const spread = (i / 7 - 0.5) * L * 0.5;
    const curl = Math.sin(time * rate + i * 0.8 + seed) * L * 0.16;
    ctx.lineWidth = Math.max(1.2, L * 0.07 * (1 - Math.abs(i / 7 - 0.5)));
    ctx.beginPath();
    ctx.moveTo(L * 0.12 + spread * 0.4, L * 0.2);
    ctx.quadraticCurveTo(spread - L * 0.1 + curl, L * 0.48, spread - L * 0.34 + curl, L * 0.66);
    ctx.stroke();
  }
  eye(ctx, L * 0.26, -L * 0.16, L * 0.06);
}

function turtle({ ctx, L, colour, time, rate, seed }: Args): void {
  const paddle = Math.sin(time * rate + seed) * 0.5;
  ctx.fillStyle = colour;
  [-1, 1].forEach((s, i) => {
    ctx.save();
    ctx.translate(-L * 0.02, s * L * 0.2);
    ctx.rotate(s * (0.4 + paddle * (i ? 1 : -1) * 0.35));
    ctx.beginPath();
    ctx.ellipse(-L * 0.18, 0, L * 0.26, L * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.beginPath();
  ctx.ellipse(0, 0, L * 0.42, L * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(-L * 0.2 + i * L * 0.1, -L * 0.04, L * 0.045, L * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(L * 0.46, -L * 0.04, L * 0.12, L * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  eye(ctx, L * 0.52, -L * 0.06, L * 0.035);
}

function whale({ ctx, L, colour, time, rate, seed }: Args): void {
  const H = L * 0.36;
  const wag = Math.sin(time * rate + seed) * L * 0.07;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(L * 0.5, H * 0.06);
  ctx.quadraticCurveTo(L * 0.3, -H * 0.72, -L * 0.1, -H * 0.6);
  ctx.quadraticCurveTo(-L * 0.36, -H * 0.42, -L * 0.42, -H * 0.16);
  ctx.quadraticCurveTo(-L * 0.34, H * 0.34, -L * 0.02, H * 0.62);
  ctx.quadraticCurveTo(L * 0.3, H * 0.72, L * 0.5, H * 0.06);
  ctx.closePath();
  ctx.fill();
  // Fluke, horizontal — a whale is not a big fish and the tail says so.
  ctx.save();
  ctx.translate(-L * 0.4, -H * 0.14 + wag);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-L * 0.12, -H * 0.1, -L * 0.26, -H * 0.42);
  ctx.quadraticCurveTo(-L * 0.06, -H * 0.12, 0, H * 0.06);
  ctx.quadraticCurveTo(-L * 0.06, H * 0.24, -L * 0.24, H * 0.5);
  ctx.quadraticCurveTo(-L * 0.1, H * 0.16, 0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(L * 0.04, H * 0.42);
  ctx.quadraticCurveTo(-L * 0.06, H * 0.95, -L * 0.16, H * 0.5);
  ctx.closePath();
  ctx.fill();
  // Pale underside, the read that makes it unmistakably a whale.
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(L * 0.08, H * 0.34, L * 0.3, H * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  eye(ctx, L * 0.34, -H * 0.14, L * 0.028);
}

type Painter = (a: Args) => void;

const PAINTERS: Record<Exclude<SpeciesKey, 'grass'>, Painter> = {
  guppy,
  shrimp,
  angel,
  jelly,
  lionfish,
  ray,
  octopus,
  turtle,
  shark: (a) => sleek(a, 1.45, 0.04),
  whale,
};

/** Draws centred at the origin, facing +x. The caller flips and scales. */
export function drawFauna(species: Exclude<SpeciesKey, 'grass'>, args: Args): void {
  PAINTERS[species](args);
}

export type { Args as FaunaArgs };
