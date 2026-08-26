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
  const H = L * 1.05;
  const wag = Math.sin(time * rate + seed) * L * 0.07;
  ctx.fillStyle = colour;
  // Compressed and taller than it is long — that proportion is the species.
  ctx.beginPath();
  ctx.ellipse(0, 0, L * 0.32, H * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pointed snout.
  ctx.beginPath();
  ctx.moveTo(L * 0.28, -H * 0.1);
  ctx.quadraticCurveTo(L * 0.5, 0, L * 0.28, H * 0.12);
  ctx.closePath();
  ctx.fill();
  // Swept dorsal and anal fins, thin rather than the great crescents they were.
  [-1, 1].forEach((sign) => {
    ctx.beginPath();
    ctx.moveTo(L * 0.14, sign * H * 0.34);
    ctx.quadraticCurveTo(-L * 0.02, sign * H * 0.86, -L * 0.34, sign * H * 0.92 + wag);
    ctx.quadraticCurveTo(-L * 0.16, sign * H * 0.5, -L * 0.26, sign * H * 0.24);
    ctx.closePath();
    ctx.fill();
  });
  // Trailing pelvic filaments.
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(0.8, L * 0.026);
  [0, 1].forEach((i) => {
    ctx.beginPath();
    ctx.moveTo(L * 0.1, H * 0.36);
    ctx.quadraticCurveTo(L * 0.02, H * 0.75, -L * 0.06 + i * L * 0.06, H * 1.0 + wag);
    ctx.stroke();
  });
  ctx.save();
  ctx.translate(-L * 0.3, 0);
  tail(ctx, L * 0.2, H * 0.36, wag);
  ctx.restore();
  // Bands.
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#0A1A22';
  [-0.1, 0.16].forEach((dx) => {
    ctx.beginPath();
    ctx.ellipse(L * dx, 0, L * 0.05, H * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  eye(ctx, L * 0.2, -H * 0.14, L * 0.05);
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
  const curl = Math.sin(time * rate + seed) * 0.18;
  ctx.fillStyle = colour;
  // Segments along an arc. A shrimp is a stack of plates, not a tube.
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const x = L * (0.3 - t * 0.62);
    const y = L * (t * t * (0.34 + curl));
    const r = L * (0.17 - t * 0.06);
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.15, r, t * (0.6 + curl), 0, Math.PI * 2);
    ctx.fill();
  }
  // Tail fan.
  ctx.save();
  ctx.translate(-L * 0.32, L * (0.34 + curl));
  ctx.rotate(0.7 + curl);
  [-0.5, 0, 0.5].forEach((a) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-L * 0.2, Math.sin(a) * L * 0.16 - L * 0.05);
    ctx.lineTo(-L * 0.16, Math.sin(a) * L * 0.16 + L * 0.05);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
  // Legs.
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(0.7, L * 0.028);
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const x = L * (0.2 - i * 0.11);
    ctx.beginPath();
    ctx.moveTo(x, L * 0.1);
    ctx.quadraticCurveTo(x - L * 0.04, L * 0.24, x - L * 0.1, L * 0.3);
    ctx.stroke();
  }
  // Antennae, most of a shrimp's silhouette.
  ctx.lineWidth = Math.max(0.6, L * 0.022);
  [0.16, 0.3].forEach((a, i) => {
    ctx.beginPath();
    ctx.moveTo(L * 0.36, -L * 0.04);
    ctx.quadraticCurveTo(L * 0.7, -L * a, L * 1.0, -L * (a * 0.4) + i * L * 0.1);
    ctx.stroke();
  });
  eye(ctx, L * 0.32, -L * 0.09, L * 0.055);
}

function sleek({ ctx, L, colour, time, rate, seed }: Args, dorsal: number, snout: number): void {
  const H = L * 0.36;
  const wag = Math.sin(time * rate + seed) * L * 0.09;
  ctx.fillStyle = colour;

  ctx.beginPath();
  ctx.moveTo(L * (0.5 + snout), -H * 0.04);
  ctx.quadraticCurveTo(L * 0.16, -H * 0.56, -L * 0.14, -H * 0.46);
  ctx.quadraticCurveTo(-L * 0.34, -H * 0.34, -L * 0.42, -H * 0.1);
  ctx.quadraticCurveTo(-L * 0.34, H * 0.26, -L * 0.1, H * 0.44);
  ctx.quadraticCurveTo(L * 0.2, H * 0.56, L * (0.5 + snout), -H * 0.04);
  ctx.closePath();
  ctx.fill();

  // Dorsal, rooted on the back rather than floating above it.
  ctx.beginPath();
  ctx.moveTo(L * 0.08, -H * 0.48);
  ctx.quadraticCurveTo(L * 0.0, -H * dorsal, -L * 0.14, -H * 0.44);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(L * 0.14, H * 0.36);
  ctx.quadraticCurveTo(L * 0.02, H * 1.0, -L * 0.1, H * 0.42);
  ctx.closePath();
  ctx.fill();

  // Crescent caudal: upper lobe longer, with a notch. This is the read.
  ctx.save();
  ctx.translate(-L * 0.42, -H * 0.06 + wag);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-L * 0.1, -H * 0.5, -L * 0.24, -H * 1.18);
  ctx.quadraticCurveTo(-L * 0.16, -H * 0.34, -L * 0.06, H * 0.06);
  ctx.quadraticCurveTo(-L * 0.16, H * 0.36, -L * 0.22, H * 0.72);
  ctx.quadraticCurveTo(-L * 0.08, H * 0.28, 0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Gills.
  ctx.strokeStyle = 'rgba(10,22,30,.22)';
  ctx.lineWidth = Math.max(0.7, L * 0.014);
  for (let i = 0; i < 4; i++) {
    const gx = L * (0.2 - i * 0.045);
    ctx.beginPath();
    ctx.moveTo(gx, -H * 0.24);
    ctx.quadraticCurveTo(gx - L * 0.02, 0, gx, H * 0.2);
    ctx.stroke();
  }
  eye(ctx, L * 0.36, -H * 0.18, L * 0.042);
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
  const span = L * 0.56;
  ctx.fillStyle = colour;
  // Wingspan is wider than the body is long. Without that it is an arrowhead.
  ctx.beginPath();
  ctx.moveTo(L * 0.46, 0);
  ctx.quadraticCurveTo(L * 0.26, -span * 0.46, -L * 0.1, -span * (0.92 + flap * 0.22));
  ctx.quadraticCurveTo(-L * 0.3, -span * 0.3, -L * 0.34, 0);
  ctx.quadraticCurveTo(-L * 0.3, span * 0.3, -L * 0.16, span * (0.92 - flap * 0.22));
  ctx.quadraticCurveTo(L * 0.1, span * 0.34, L * 0.46, 0);
  ctx.closePath();
  ctx.fill();
  // Head bump, so the leading edge is not a knife.
  ctx.beginPath();
  ctx.ellipse(L * 0.28, 0, L * 0.14, span * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Whip tail, thick at the root.
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.4, L * 0.055);
  ctx.beginPath();
  ctx.moveTo(-L * 0.3, 0);
  ctx.quadraticCurveTo(-L * 0.6, flap * span * 0.14, -L * 0.8, flap * span * 0.2);
  ctx.stroke();
  ctx.lineWidth = Math.max(0.8, L * 0.022);
  ctx.beginPath();
  ctx.moveTo(-L * 0.78, flap * span * 0.19);
  ctx.quadraticCurveTo(-L * 0.95, flap * span * 0.24, -L * 1.06, flap * span * 0.3);
  ctx.stroke();
  eye(ctx, L * 0.3, -span * 0.16, L * 0.04);
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
  const paddle = Math.sin(time * rate + seed);
  ctx.fillStyle = colour;

  // Rear flipper, behind the shell.
  ctx.save();
  ctx.translate(-L * 0.3, L * 0.12);
  ctx.rotate(0.5 - paddle * 0.25);
  ctx.beginPath();
  ctx.ellipse(-L * 0.1, 0, L * 0.15, L * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Carapace: domed on top, flat beneath. A plain ellipse reads as a lemon.
  ctx.beginPath();
  ctx.moveTo(-L * 0.4, L * 0.06);
  ctx.quadraticCurveTo(-L * 0.34, -L * 0.32, 0, -L * 0.34);
  ctx.quadraticCurveTo(L * 0.34, -L * 0.32, L * 0.4, L * 0.04);
  ctx.quadraticCurveTo(L * 0.2, L * 0.22, 0, L * 0.23);
  ctx.quadraticCurveTo(-L * 0.2, L * 0.22, -L * 0.4, L * 0.06);
  ctx.closePath();
  ctx.fill();

  // Scutes — hexagons, not portholes.
  ctx.globalAlpha = 0.26;
  ctx.strokeStyle = '#08161E';
  ctx.lineWidth = Math.max(0.8, L * 0.016);
  for (let i = 0; i < 4; i++) {
    const cx = -L * 0.21 + i * L * 0.14;
    const cy = -L * 0.08 - Math.cos((i - 1.5) * 0.7) * L * 0.04;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.5;
      const px = cx + Math.cos(a) * L * 0.075;
      const py = cy + Math.sin(a) * L * 0.075;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Front flipper, the big one, in front of the shell.
  ctx.fillStyle = colour;
  ctx.save();
  ctx.translate(L * 0.2, L * 0.12);
  ctx.rotate(0.75 + paddle * 0.4);
  ctx.beginPath();
  ctx.ellipse(L * 0.16, 0, L * 0.24, L * 0.075, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Head on a short neck, with a beak.
  ctx.beginPath();
  ctx.ellipse(L * 0.43, -L * 0.08, L * 0.13, L * 0.1, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(L * 0.53, -L * 0.11);
  ctx.lineTo(L * 0.6, -L * 0.05);
  ctx.lineTo(L * 0.5, -L * 0.01);
  ctx.closePath();
  ctx.fill();
  eye(ctx, L * 0.47, -L * 0.12, L * 0.035);
}

function whale({ ctx, L, colour, time, rate, seed }: Args): void {
  const H = L * 0.44;
  const wag = Math.sin(time * rate + seed) * L * 0.05;
  ctx.fillStyle = colour;

  // Fluke first, so the body's tail stock sits over its root. Two lobes with a
  // centre notch — a whale is not a fish and the tail is what says so.
  ctx.save();
  ctx.translate(-L * 0.4, wag);
  ctx.beginPath();
  ctx.moveTo(L * 0.1, -H * 0.11);
  ctx.quadraticCurveTo(-L * 0.06, -H * 0.42, -L * 0.3, -H * 0.74);
  // Back to the centre notch, not to the outbound line — otherwise both lobes
  // collapse into slivers and the tail disappears.
  ctx.quadraticCurveTo(-L * 0.12, -H * 0.26, -L * 0.05, 0);
  ctx.quadraticCurveTo(-L * 0.12, H * 0.26, -L * 0.3, H * 0.74);
  ctx.quadraticCurveTo(-L * 0.06, H * 0.42, L * 0.1, H * 0.11);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Body: blunt head, deep chest, narrowing hard to the stock.
  ctx.beginPath();
  ctx.moveTo(L * 0.48, -H * 0.12);
  ctx.quadraticCurveTo(L * 0.34, -H * 0.5, L * 0.02, -H * 0.5);
  ctx.quadraticCurveTo(-L * 0.24, -H * 0.44, -L * 0.4, -H * 0.12);
  ctx.quadraticCurveTo(-L * 0.3, H * 0.02, -L * 0.4, H * 0.12);
  ctx.quadraticCurveTo(-L * 0.16, H * 0.5, L * 0.1, H * 0.52);
  ctx.quadraticCurveTo(L * 0.4, H * 0.5, L * 0.48, -H * 0.12);
  ctx.closePath();
  ctx.fill();

  // Pale underside.
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(L * 0.4, H * 0.14);
  ctx.quadraticCurveTo(L * 0.08, H * 0.56, -L * 0.24, H * 0.3);
  ctx.quadraticCurveTo(L * 0.02, H * 0.3, L * 0.4, H * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Pectoral fin, long and low.
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(L * 0.18, H * 0.34);
  ctx.quadraticCurveTo(L * 0.02, H * 0.92, -L * 0.14, H * 0.74);
  ctx.quadraticCurveTo(-L * 0.02, H * 0.5, L * 0.06, H * 0.34);
  ctx.closePath();
  ctx.fill();

  // Mouth line, the other half of the read.
  ctx.strokeStyle = 'rgba(8,20,28,.28)';
  ctx.lineWidth = Math.max(1, L * 0.014);
  ctx.beginPath();
  ctx.moveTo(L * 0.47, -H * 0.06);
  ctx.quadraticCurveTo(L * 0.3, H * 0.26, L * 0.08, H * 0.28);
  ctx.stroke();

  eye(ctx, L * 0.33, -H * 0.06, L * 0.026);
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
