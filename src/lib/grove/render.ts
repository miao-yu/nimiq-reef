import { clamp, ease, rng } from './rng';
import { SPECIES } from './species';
import type { GrovePalette, Plant, RenderOptions, SpeciesKey } from './types';

type Ctx = CanvasRenderingContext2D;
type Rand = () => number;
interface Tip {
  x: number;
  y: number;
}

function stem(ctx: Ctx, x: number, y: number, h: number, lean: number, w: number, color: string): Tip {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * 0.4, y - h * 0.55, x + lean, y - h);
  ctx.stroke();
  return { x: x + lean, y: y - h };
}

function leaf(ctx: Ctx, x: number, y: number, r: number, angle: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(r * 0.6, 0, r, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSprout(ctx: Ctx, x: number, y: number, g: number, r: Rand, p: GrovePalette, sc: number): void {
  const h = 34 * g * sc;
  const lean = (r() - 0.5) * 10 * g;
  stem(ctx, x, y, h, lean, 2.1 * sc, p.leaf2);
  for (let i = 0; i < 2; i++) {
    const f = 0.5 + i * 0.32;
    leaf(ctx, x + lean * f, y - h * f, 8 * g * sc, i % 2 ? Math.PI + 0.5 : -0.5, i % 2 ? p.leaf1 : p.leaf3);
  }
}

function drawFern(ctx: Ctx, x: number, y: number, g: number, r: Rand, p: GrovePalette, sc: number): void {
  const h = 66 * g * sc;
  const lean = (r() - 0.5) * 16 * g;
  stem(ctx, x, y, h, lean, 2.4 * sc, p.leaf2);
  const pairs = 6;
  for (let i = 0; i < pairs; i++) {
    const f = 0.24 + (i / pairs) * 0.72;
    const lx = x + lean * f;
    const ly = y - h * f;
    const size = 13 * g * sc * (1 - f * 0.45);
    leaf(ctx, lx, ly, size, -0.62 - f * 0.3, p.leaf1);
    leaf(ctx, lx, ly, size, Math.PI + 0.62 + f * 0.3, p.leaf3);
  }
}

function drawBloom(ctx: Ctx, x: number, y: number, g: number, r: Rand, p: GrovePalette, sc: number): void {
  const h = 78 * g * sc;
  const lean = (r() - 0.5) * 20 * g;
  const tip = stem(ctx, x, y, h, lean, 2.2 * sc, p.leaf2);
  leaf(ctx, x + lean * 0.45, y - h * 0.45, 11 * g * sc, -0.55, p.leaf1);
  leaf(ctx, x + lean * 0.66, y - h * 0.66, 9 * g * sc, Math.PI + 0.55, p.leaf3);

  // Flowers only open in the last 45% of growth — the visible payoff for waiting.
  if (g <= 0.55) return;
  const f = (g - 0.55) / 0.45;
  const pr = 5.4 * f * sc;
  ctx.fillStyle = p.bloomA;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + r() * 0.4;
    ctx.beginPath();
    ctx.arc(tip.x + Math.cos(a) * pr * 1.15, tip.y + Math.sin(a) * pr * 1.15, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = p.bloomB;
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, pr * 0.82, 0, Math.PI * 2);
  ctx.fill();
}

function drawElder(ctx: Ctx, x: number, y: number, g: number, _r: Rand, p: GrovePalette, sc: number): void {
  const h = 96 * g * sc;
  const w = 8.5 * g * sc;

  ctx.fillStyle = p.trunk;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.62, y);
  ctx.quadraticCurveTo(x - w * 0.3, y - h * 0.6, x - w * 0.28, y - h);
  ctx.lineTo(x + w * 0.28, y - h);
  ctx.quadraticCurveTo(x + w * 0.3, y - h * 0.6, x + w * 0.62, y);
  ctx.closePath();
  ctx.fill();

  const cr = 30 * g * sc;
  const canopy: [number, number, number][] = [
    [0, -h - cr * 0.25, 1],
    [-cr * 0.82, -h + cr * 0.2, 0.78],
    [cr * 0.82, -h + cr * 0.2, 0.78],
    [-cr * 0.4, -h - cr * 0.75, 0.66],
    [cr * 0.45, -h - cr * 0.68, 0.62],
  ];
  canopy.forEach(([dx, dy, size], i) => {
    ctx.fillStyle = i % 2 ? p.leaf1 : p.leaf2;
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, cr * size, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.globalAlpha = 0.55;
  ctx.fillStyle = p.leaf3;
  ctx.beginPath();
  ctx.arc(x - cr * 0.3, y - h - cr * 0.5, cr * 0.44, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

const PAINTERS: Record<SpeciesKey, (c: Ctx, x: number, y: number, g: number, r: Rand, p: GrovePalette, sc: number) => void> = {
  sprout: drawSprout,
  fern: drawFern,
  bloom: drawBloom,
  elder: drawElder,
};

function growthOf(plant: Plant, day: number): number {
  const age = day - plant.plantedDay;
  return ease(clamp(age / SPECIES[plant.species].matures, 0.06, 1));
}

export function renderGrove(ctx: Ctx, options: RenderOptions): void {
  const { width: w, height: h, day, plants, palette: p } = options;
  const scale = options.scale ?? clamp(w / 820, 0.62, 1.15);
  const groundY = h * 0.82;

  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, p.skyTop);
  sky.addColorStop(1, p.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = p.soil;
  ctx.fillRect(0, groundY, w, h - groundY);
  ctx.fillStyle = p.soilDark;
  ctx.fillRect(0, groundY, w, 2);

  // Soil speckle. Fixed seed so the ground never shimmers between repaints.
  const grit = rng(9182);
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 46; i++) {
    const dx = grit() * w;
    const dy = groundY + 6 + grit() * (h - groundY - 8);
    ctx.beginPath();
    ctx.arc(dx, dy, grit() * 1.5 + 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const painted = [...plants]
    .filter((plant) => day >= plant.plantedDay)
    .sort((a, b) => SPECIES[a.species].depth - SPECIES[b.species].depth);

  painted.forEach((plant) => {
    const g = growthOf(plant, day);
    const x = plant.x * w;
    const r = rng(plant.seed * 7919);

    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = p.soilDark;
    ctx.beginPath();
    ctx.ellipse(x, groundY + 3, 12 * g * scale, 3 * g * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    PAINTERS[plant.species](ctx, x, groundY, g, r, p, scale);
  });
}
