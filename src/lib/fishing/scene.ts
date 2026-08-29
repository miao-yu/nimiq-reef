import { drawFauna, BODY_LENGTH, TAIL_RATE, colourFor } from '@/lib/tank/fauna';
import { isFlora } from '@/lib/tank/types';
import type { FaunaKey, SpeciesKey, TankPalette, Tier } from '@/lib/tank/types';

type Ctx = CanvasRenderingContext2D;

/**
 * The water you fish in, seen from just under the surface.
 *
 * Deliberately not `renderTank`: that composition is a glass box in a room,
 * and this one is open water with a line coming down into it. What the two
 * share is the palette type and `drawFauna`, so the fish that surfaces here is
 * exactly the fish that will swim in the tank afterwards.
 */

export type Phase =
  | 'ready'
  | 'casting'
  | 'sinking'
  | 'waiting'
  | 'bite'
  | 'landing'
  | 'landed'
  | 'missed';

export interface FishingScene {
  width: number;
  height: number;
  /** Seconds, for ambient motion. */
  time: number;
  palette: TankPalette;
  phase: Phase;
  /** 0..1 through the current phase. */
  progress: number;
  fish?: { species: SpeciesKey; tier: Tier; seed: number };
}

const SURFACE = 0.2;

function hexAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Where the float sits, 0..1 across and down. Drives the line too. */
function floatAt(s: FishingScene): { x: number; y: number; sunk: number } {
  const surfaceY = s.height * SURFACE;
  const restX = s.width * 0.42;

  if (s.phase === 'ready') return { x: s.width * 0.82, y: surfaceY, sunk: 0 };
  if (s.phase === 'casting') {
    // An arc out from the rod. Eased so it decelerates into the water.
    const t = s.progress;
    const x = s.width * 0.82 + (restX - s.width * 0.82) * t;
    const lift = Math.sin(t * Math.PI) * s.height * 0.22;
    return { x, y: surfaceY - lift, sunk: 0 };
  }
  if (s.phase === 'bite') {
    // Two sharp dips, then under and gone.
    const t = s.progress;
    return { x: restX, y: surfaceY, sunk: Math.min(1, 0.35 + t * 1.4) };
  }
  if (s.phase === 'landing' || s.phase === 'landed') return { x: restX, y: surfaceY, sunk: 1 };
  return { x: restX, y: surfaceY, sunk: 0 };
}

function drawWater(ctx: Ctx, s: FishingScene): void {
  const surfaceY = s.height * SURFACE;
  const p = s.palette;

  // Above the surface: air, lit from the same direction as the water below.
  // Filling it with `room` gave a black bar that read as a letterbox rather
  // than as sky.
  const air = ctx.createLinearGradient(0, 0, 0, surfaceY);
  air.addColorStop(0, hexAlpha(p.caustic, 0.22));
  air.addColorStop(1, hexAlpha(p.waterTop, 0.55));
  ctx.fillStyle = p.room;
  ctx.fillRect(0, 0, s.width, surfaceY);
  ctx.fillStyle = air;
  ctx.fillRect(0, 0, s.width, surfaceY);

  const g = ctx.createLinearGradient(0, surfaceY, 0, s.height);
  g.addColorStop(0, p.waterTop);
  g.addColorStop(0.45, p.waterMid);
  g.addColorStop(1, p.waterDeep);
  ctx.fillStyle = g;
  ctx.fillRect(0, surfaceY, s.width, s.height - surfaceY);

  // Shafts, angled and slow.
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = p.shaft;
  for (let i = 0; i < 5; i++) {
    const x = ((i + 0.5) / 5) * s.width + Math.sin(s.time * 0.2 + i) * 14;
    ctx.beginPath();
    ctx.moveTo(x - s.width * 0.03, surfaceY);
    ctx.lineTo(x + s.width * 0.03, surfaceY);
    ctx.lineTo(x + s.width * 0.1, s.height);
    ctx.lineTo(x - s.width * 0.06, s.height);
    ctx.fill();
  }
  ctx.restore();

  // A seabed, so the water has a floor and a sense of depth. Without it the
  // whole frame was one flat expanse of blue with a float in it.
  const bedY = s.height * 0.86;
  ctx.fillStyle = p.sandDark;
  ctx.beginPath();
  ctx.moveTo(0, s.height);
  ctx.lineTo(0, bedY + 8);
  for (let x = 0; x <= s.width; x += 24) {
    ctx.lineTo(x, bedY + Math.sin(x * 0.012 + 1.7) * 7);
  }
  ctx.lineTo(s.width, s.height);
  ctx.fill();

  // Weed on the bed, swaying. Silhouettes only — this is the far distance.
  ctx.strokeStyle = hexAlpha(p.plantB, 0.55);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const x = ((i + 0.5) / 9) * s.width + Math.sin(i * 2.1) * 12;
    const h = s.height * (0.06 + ((i * 37) % 40) / 400);
    ctx.beginPath();
    ctx.moveTo(x, bedY + 4);
    ctx.quadraticCurveTo(x + Math.sin(s.time * 0.7 + i) * 9, bedY - h * 0.6, x + Math.sin(s.time * 0.7 + i) * 14, bedY - h);
    ctx.stroke();
  }

  // Motes drifting, so still water is not dead water.
  ctx.fillStyle = hexAlpha(p.bubble, 0.3);
  for (let i = 0; i < 18; i++) {
    const seed = i * 2.399;
    const x = ((Math.sin(seed) + 1) / 2) * s.width + Math.sin(s.time * 0.4 + i) * 6;
    const rise = ((Math.cos(seed) + 1) / 2 + s.time * 0.012 * (0.5 + (i % 5) / 8)) % 1;
    ctx.beginPath();
    ctx.arc(x, s.height - rise * (s.height - surfaceY), 1.4 + (i % 3) * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // The waterline itself, moving.
  ctx.strokeStyle = hexAlpha(p.caustic, 0.5);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= s.width; x += 6) {
    const y = surfaceY + Math.sin(x * 0.035 + s.time * 1.6) * 2.4;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawRodAndLine(ctx: Ctx, s: FishingScene, f: { x: number; y: number; sunk: number }): void {
  const tipX = s.width * 0.9;
  const tipY = s.height * 0.06;

  // Rod: a taper from off-screen top right down to the tip.
  ctx.strokeStyle = '#6B4A33';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s.width + 30, -20);
  ctx.quadraticCurveTo(s.width * 0.97, tipY * 0.4, tipX, tipY);
  ctx.stroke();

  // Line, slack into a catenary rather than a straight rule.
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  const sag = s.phase === 'landing' ? 6 : 20;
  ctx.quadraticCurveTo((tipX + f.x) / 2, f.y - sag, f.x, f.y);
  ctx.stroke();
}

function drawFloat(ctx: Ctx, s: FishingScene, f: { x: number; y: number; sunk: number }): void {
  const bob = s.phase === 'waiting' ? Math.sin(s.time * 2.2) * 2.5 : 0;
  // Big enough to watch from arm's length: this is the thing the whole
  // minigame asks you to stare at.
  const R = Math.max(9, s.width * 0.026);
  const y = f.y + bob + f.sunk * R * 5;

  // Ripples where the line enters the water.
  if (f.sunk < 1) {
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 1;
    const speed = s.phase === 'bite' ? 2.4 : 0.8;
    for (let i = 0; i < 3; i++) {
      const t = (s.time * speed + i / 3) % 1;
      ctx.globalAlpha = (1 - t) * 0.5;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, R + t * R * 5, (R + t * R * 5) * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // The float: red over white, the shape everyone recognises.
  ctx.save();
  ctx.translate(f.x, y);
  ctx.fillStyle = '#E5473B';
  ctx.beginPath();
  ctx.ellipse(0, -R * 0.5, R * 0.72, R, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#F4F1EA';
  ctx.beginPath();
  ctx.ellipse(0, -R * 0.5, R * 0.72, R, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#2B3B46';
  ctx.fillRect(-R * 0.09, -R * 2.1, R * 0.18, R * 1.1);
  ctx.restore();
}

/** The catch, rising into view. */
function drawCatch(ctx: Ctx, s: FishingScene): void {
  if (!s.fish) return;
  const surfaceY = s.height * SURFACE;
  const rise = s.phase === 'landed' ? 1 : s.progress;
  const L = Math.min(s.width, s.height * 1.6) * 0.36 * BODY_LENGTH[s.fish.species];

  ctx.save();
  ctx.translate(s.width * 0.42, s.height * 0.92 - (s.height * 0.92 - surfaceY - L * 0.6) * rise);
  ctx.scale(-1, 1); // facing the rod
  drawFauna(s.fish.species as FaunaKey, {
    ctx,
    L: Math.max(26, L),
    colour: colourFor(s.fish.species, s.fish.tier, s.fish.seed),
    time: s.time,
    seed: s.fish.seed % 100,
    rate: TAIL_RATE[s.fish.species] * 2.2,
    tier: s.fish.tier,
  });
  ctx.restore();
}

export function drawFishing(ctx: Ctx, s: FishingScene): void {
  ctx.clearRect(0, 0, s.width, s.height);
  drawWater(ctx, s);

  const f = floatAt(s);
  if ((s.phase === 'landing' || s.phase === 'landed') && !isFlora(s.fish?.species ?? '')) {
    drawCatch(ctx, s);
  }
  drawRodAndLine(ctx, s, f);
  drawFloat(ctx, s, f);
}
