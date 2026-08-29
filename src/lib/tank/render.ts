import { clamp, lerp, tankRect } from './geometry';
import { drawFauna, BODY_LENGTH, TAIL_RATE, colourFor } from './fauna';
import { FLORA_HEIGHT, drawFlora, grassPositions } from './flora';
import { placeAt, STILL_TIME } from './motion';
import { faunaScale, grassScale } from './growth';
import { isFlora, type FaunaKey, type FloraKey } from './types';
import {
  clipToTank,
  drawBubbles,
  drawCaustics,
  drawGlass,
  drawRoom,
  drawShafts,
  drawSubstrate,
  drawSurface,
  drawWater,
  drawAir,
  makeBubbles,
  makeFlakes,
  drawFlakes,
} from './scene';
import type { Inhabitant, RenderOptions } from './types';

const BUBBLES = makeBubbles();

// Precomputed per feeding, capped: past a few handfuls more flakes stop
// reading as generosity and start reading as a dirty tank.
const MAX_FEEDINGS_SHOWN = 4;
const FLAKES = Array.from({ length: MAX_FEEDINGS_SHOWN }, (_, i) => makeFlakes(i));

/**
 * Draw the whole tank.
 *
 * Framework-free and deterministic on purpose: no React, no DOM beyond a canvas
 * context, no Math.random(). @napi-rs/canvas hands us a compatible context on
 * the server, so a shared card is the same picture the player was looking at
 * rather than an approximation of it.
 */
export function renderTank(ctx: CanvasRenderingContext2D, options: RenderOptions): void {
  const moving = options.motion !== false;
  const time = moving ? options.time : STILL_TIME;
  const tank = tankRect(options);
  const p = options.palette;

  // One unit of body length. Tied to the smaller dimension so a wide, shallow
  // tank does not produce whales that overflow the glass.
  const S = options.scale ?? Math.min(tank.w, tank.h * 1.6) * 0.36;

  drawRoom(ctx, options.width, options.height, p);

  ctx.save();
  clipToTank(ctx, tank);

  drawAir(ctx, tank, p);
  drawWater(ctx, tank, p);
  drawShafts(ctx, tank, p, time);
  drawSubstrate(ctx, tank, p);
  drawCaustics(ctx, tank, p, time);

  // Feeding excites the tank for as long as the flakes are falling. Saturates
  // quickly — the difference between one feeding and four is how much food is
  // in the water, not how much more frantic the fish get.
  const fed = Math.min(MAX_FEEDINGS_SHOWN, Math.max(0, Math.floor(options.feedings ?? 0)));
  const interest = fed === 0 ? 0 : Math.min(1, 0.55 + (fed - 1) * 0.15);

  // Asking `=== 'grass'` was true for exactly as long as there was one plant.
  const flora = options.inhabitants.filter((i) => isFlora(i.species));
  const fauna = options.inhabitants.filter((i) => !isFlora(i.species));

  grassPositions(tank, flora.length).forEach((x, i) => {
    const plant = flora[i]!;
    const kind = plant.species as FloraKey;
    const height =
      (tank.groundY - tank.surfaceY) * 0.3 * grassScale(plant.ageDays) * FLORA_HEIGHT[kind];
    drawFlora(kind, ctx, x, tank.groundY + 4, height, p, time, plant.seed, moving ? 1 : 0.35);
  });

  // Far to near, so nearer things overlap what is behind them.
  const placed = fauna
    .map((inhabitant, index) => ({
      inhabitant,
      index,
      at: placeAt(inhabitant, tank, time, index, interest),
    }))
    .sort((a, b) => a.at.depth - b.at.depth);

  placed.forEach(({ inhabitant, index, at }) => {
    const species = inhabitant.species as FaunaKey;
    ctx.save();
    ctx.translate(at.x, at.y);
    // Haze with distance. Cheap depth, and it stops a crowded tank reading flat.
    ctx.globalAlpha = lerp(0.42, 1, at.depth);
    // Depth for perspective, age for growth. Both are plain multipliers on
    // the same transform, so a young fish far away is small twice over.
    const scale = lerp(0.52, 1, at.depth) * faunaScale(inhabitant.ageDays);
    ctx.scale(at.dir * scale, scale);
    drawFauna(species, {
      ctx,
      L: BODY_LENGTH[species] * S,
      colour: colourFor(species, inhabitant.tier, inhabitant.seed),
      tier: inhabitant.tier,
      time,
      seed: inhabitant.seed % 100,
      rate: TAIL_RATE[species] * (moving ? 1 : 0),
    });
    ctx.restore();
    void index;
  });

  ctx.globalAlpha = 1;
  for (let i = 0; i < fed; i++) drawFlakes(ctx, tank, p, FLAKES[i]!, time + i * 3.1);
  drawBubbles(ctx, tank, p, BUBBLES, time);
  drawSurface(ctx, tank, p, time);

  ctx.restore();
  drawGlass(ctx, tank, p);
}

export { tankRect, clamp, lerp };
