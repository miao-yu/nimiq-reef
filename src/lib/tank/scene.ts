import { rng } from './rng';
import type { TankPalette, TankRect } from './types';

type Ctx = CanvasRenderingContext2D;

/** Behind the glass. The only part of the tank that follows the page theme. */
export function drawRoom(ctx: Ctx, w: number, h: number, p: TankPalette): void {
  ctx.fillStyle = p.room;
  ctx.fillRect(0, 0, w, h);
}

/** The air gap above the waterline. Without it a shallow tank looks broken. */
export function drawAir(ctx: Ctx, t: TankRect, p: TankPalette): void {
  if (t.surfaceY <= t.y + 1) return;
  const g = ctx.createLinearGradient(0, t.y, 0, t.surfaceY);
  g.addColorStop(0, p.room);
  g.addColorStop(1, hexAlpha(p.waterTop, 0.28));
  ctx.fillStyle = g;
  ctx.fillRect(t.x, t.y, t.w, t.surfaceY - t.y);
}

export function drawWater(ctx: Ctx, t: TankRect, p: TankPalette): void {
  const g = ctx.createLinearGradient(0, t.surfaceY, 0, t.y + t.h);
  g.addColorStop(0, p.waterTop);
  g.addColorStop(0.46, p.waterMid);
  g.addColorStop(1, p.waterDeep);
  ctx.fillStyle = g;
  ctx.fillRect(t.x, t.surfaceY, t.w, t.y + t.h - t.surfaceY);
}

/**
 * Light from above. Four shafts drifting out of phase — the cheapest thing in
 * the whole scene that makes still water look like it is being lit rather than
 * filled with paint.
 */
export function drawShafts(ctx: Ctx, t: TankRect, p: TankPalette, time: number): void {
  const depth = t.groundY - t.surfaceY;
  for (let i = 0; i < 4; i++) {
    const drift = Math.sin(time * 0.17 + i * 1.7) * t.w * 0.035;
    const x = t.x + t.w * (0.14 + i * 0.24) + drift;
    const width = t.w * 0.065;

    const g = ctx.createLinearGradient(0, t.surfaceY, 0, t.groundY);
    g.addColorStop(0, hexAlpha(p.shaft, 0.17));
    g.addColorStop(1, hexAlpha(p.shaft, 0));
    ctx.fillStyle = g;

    ctx.beginPath();
    ctx.moveTo(x, t.surfaceY);
    ctx.lineTo(x + width, t.surfaceY);
    ctx.lineTo(x + width * 2.6, t.groundY);
    ctx.lineTo(x - width * 0.7, t.groundY);
    ctx.closePath();
    ctx.fill();
    void depth;
  }
}

export function drawSubstrate(ctx: Ctx, t: TankRect, p: TankPalette): void {
  ctx.fillStyle = p.sand;
  ctx.beginPath();
  ctx.moveTo(t.x, t.groundY + 5);
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const gx = (t.w / steps) * i;
    ctx.quadraticCurveTo(
      t.x + gx + t.w / (steps * 2),
      t.groundY - 4 + Math.sin(i * 1.3) * 5,
      t.x + gx + t.w / steps,
      t.groundY + 2,
    );
  }
  ctx.lineTo(t.x + t.w, t.y + t.h);
  ctx.lineTo(t.x, t.y + t.h);
  ctx.closePath();
  ctx.fill();

  // Grit. Fixed seed, so the floor never shimmers between repaints.
  const r = rng(4242);
  ctx.fillStyle = p.sandDark;
  for (let i = 0; i < 110; i++) {
    ctx.globalAlpha = 0.35 + r() * 0.4;
    ctx.beginPath();
    ctx.arc(t.x + r() * t.w, t.groundY + 6 + r() * (t.h * 0.085), r() * 1.7 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Moving light on the floor. Reads as water even in a still frame. */
export function drawCaustics(ctx: Ctx, t: TankRect, p: TankPalette, time: number): void {
  ctx.strokeStyle = hexAlpha(p.caustic, 0.13);
  ctx.lineWidth = 2;
  for (let band = 0; band < 5; band++) {
    ctx.beginPath();
    for (let px = 0; px <= t.w; px += 8) {
      const py = t.groundY + 9 + band * 5 + Math.sin(px * 0.028 + time * 0.65 + band) * 3.2;
      if (px === 0) ctx.moveTo(t.x + px, py);
      else ctx.lineTo(t.x + px, py);
    }
    ctx.stroke();
  }
}

export function drawSurface(ctx: Ctx, t: TankRect, p: TankPalette, time: number): void {
  ctx.strokeStyle = hexAlpha(p.glass, 0.4);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= t.w; x += 6) {
    const y = t.surfaceY + Math.sin(x * 0.045 + time * 1.2) * 2.4;
    if (x === 0) ctx.moveTo(t.x + x, y);
    else ctx.lineTo(t.x + x, y);
  }
  ctx.stroke();
}

export interface Bubble {
  x: number;
  y0: number;
  r: number;
  speed: number;
  phase: number;
}

export function makeBubbles(count = 26): Bubble[] {
  const r = rng(90210);
  return Array.from({ length: count }, () => ({
    x: r(),
    y0: r(),
    r: 1 + r() * 2.4,
    speed: 0.03 + r() * 0.06,
    phase: r() * Math.PI * 2,
  }));
}

export function drawBubbles(
  ctx: Ctx,
  t: TankRect,
  p: TankPalette,
  bubbles: readonly Bubble[],
  time: number,
): void {
  const column = t.groundY - t.surfaceY;
  ctx.fillStyle = hexAlpha(p.bubble, 0.42);
  bubbles.forEach((b) => {
    const rise = (b.y0 + time * b.speed) % 1;
    const y = t.groundY - rise * column;
    const x = t.x + b.x * t.w + Math.sin(time * 1.3 + b.phase) * 5;
    ctx.beginPath();
    ctx.arc(x, y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function drawGlass(ctx: Ctx, t: TankRect, p: TankPalette): void {
  const sheen = ctx.createLinearGradient(t.x, t.y, t.x + t.w * 0.55, t.y + t.h);
  sheen.addColorStop(0, 'rgba(255,255,255,.085)');
  sheen.addColorStop(0.42, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(t.x, t.y, t.w, t.h);

  ctx.strokeStyle = hexAlpha(p.glass, 0.45);
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundRect(ctx, t.x, t.y, t.w, t.h, Math.min(16, t.w * 0.03));
  ctx.stroke();
}

export function clipToTank(ctx: Ctx, t: TankRect): void {
  ctx.beginPath();
  roundRect(ctx, t.x, t.y, t.w, t.h, Math.min(16, t.w * 0.03));
  ctx.clip();
}

/** Hand-rolled: @napi-rs/canvas and older browsers do not all have roundRect. */
function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** #rrggbb plus alpha. Palette values come from CSS, so they are always hex. */
function hexAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
