import 'server-only';
import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas';
import { renderGrove } from '@/lib/grove/render';
import { LIGHT_PALETTE } from '@/lib/grove/palette';
import type { Plant } from '@/lib/grove';

/**
 * Draw a grove to a PNG, server-side.
 *
 * This reuses `renderGrove` unchanged — the same function the phone runs. That
 * is why the renderer has no React, no DOM beyond a canvas context, and no
 * Math.random(): every plant carries a seed, so the image somebody shares is
 * pixel-identical to the grove they were looking at.
 */
export interface ShareOptions {
  plants: readonly Plant[];
  day: number;
  caption: string;
  width?: number;
  height?: number;
}

export function renderShareImage({
  plants,
  day,
  caption,
  width = 1200,
  height = 630,
}: ShareOptions): Buffer {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // The scene is authored for a phone canvas. On a 1200x630 card the default
  // horizon leaves the plants stranded in a field of sky, so drop the horizon
  // and push the scale up until the garden actually fills the frame.
  renderGrove(ctx as unknown as CanvasRenderingContext2D, {
    width,
    height,
    day,
    plants,
    palette: LIGHT_PALETTE,
    scale: width / 430,
    groundRatio: 0.74,
  });

  drawCaption(ctx, caption, width, height);
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
  ctx.fillText('grove.nimiq.cafe', pad, height - pad);
}
