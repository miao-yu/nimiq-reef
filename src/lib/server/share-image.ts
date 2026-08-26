import 'server-only';
import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas';
import { renderTank } from '@/lib/tank/render';
import { TANK_PALETTE } from '@/lib/tank/palette';
import { STILL_TIME } from '@/lib/tank/motion';
import type { Inhabitant } from '@/lib/tank/types';

/**
 * Draw a reef to a PNG, server-side.
 *
 * This reuses `renderReef` unchanged — the same function the phone runs. That
 * is why the renderer has no React, no DOM beyond a canvas context, and no
 * Math.random(): every plant carries a seed, so the image somebody shares is
 * pixel-identical to the reef they were looking at.
 */
export interface ShareOptions {
  inhabitants: readonly Inhabitant[];
  /** 0..1, from stake amount. */
  waterLevel: number;
  feedings?: number;
  caption: string;
  width?: number;
  height?: number;
}

export function renderShareImage({
  inhabitants,
  waterLevel,
  feedings,
  caption,
  width = 1200,
  height = 630,
}: ShareOptions): Buffer {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // motion:false draws a single composed frame at a fixed moment, so the card
  // is a deliberate picture rather than an arbitrary pause.
  renderTank(ctx as unknown as CanvasRenderingContext2D, {
    width,
    height,
    time: STILL_TIME,
    inhabitants,
    palette: TANK_PALETTE,
    waterLevel,
    feedings,
    motion: false,
  });

  drawCaption(ctx, caption, width, height);
  return canvas.toBuffer('image/png');
}

/**
 * A small, captionless tank — for a candidate you might feed, or a reef page.
 *
 * Deliberately not the share card: no caption band, no wordmark, and small
 * enough to sit in a list. Same renderer, so it is the same reef.
 */
export function renderReefCard(
  inhabitants: readonly Inhabitant[],
  waterLevel: number,
  feedings = 0,
  width = 480,
  height = 300,
): Buffer {
  const canvas = createCanvas(width, height);
  renderTank(canvas.getContext('2d') as unknown as CanvasRenderingContext2D, {
    width,
    height,
    time: STILL_TIME,
    inhabitants,
    palette: TANK_PALETTE,
    waterLevel,
    feedings,
    motion: false,
  });
  return canvas.toBuffer('image/png');
}

function drawCaption(ctx: SKRSContext2D, caption: string, width: number, height: number): void {
  const pad = 44;

  // A soft band so the text stays readable over whatever grew there.
  const veil = ctx.createLinearGradient(0, height - 190, 0, height);
  veil.addColorStop(0, 'rgba(20, 32, 26, 0)');
  veil.addColorStop(1, 'rgba(20, 32, 26, 0.55)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, height - 190, width, 190);

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 46px sans-serif';
  ctx.fillText(caption, pad, height - pad - 44);

  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = '400 26px sans-serif';
  ctx.fillText('reef.nimiq.cafe', pad, height - pad);
}
