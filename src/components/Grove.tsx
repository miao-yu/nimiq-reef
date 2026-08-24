'use client';

import { useCallback, useEffect, useRef } from 'react';
import { paletteFromCss, renderGrove, type Plant } from '@/lib/grove';

interface GroveProps {
  plants: readonly Plant[];
  day: number;
  className?: string;
  /** Announced to screen readers in place of the canvas. */
  label?: string;
}

export function Grove({ plants, day, className, label }: GroveProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const size = useRef({ w: 0, h: 0 });

  const paint = useCallback(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { w, h } = size.current;
    if (w === 0 || h === 0) return;
    renderGrove(ctx, { width: w, height: h, day, plants, palette: paletteFromCss() });
  }, [day, plants]);

  const fit = useCallback(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    size.current = { w, h };
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint();
  }, [paint]);

  // Size to the element, and re-fit whenever the box changes.
  useEffect(() => {
    fit();
    const observer = new ResizeObserver(fit);
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [fit]);

  useEffect(paint, [paint]);

  // The palette lives in CSS custom properties, so a theme flip needs a repaint
  // in both directions: the OS preference and an explicit data-theme stamp.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', paint);
    const observer = new MutationObserver(paint);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style'],
    });
    return () => {
      media.removeEventListener('change', paint);
      observer.disconnect();
    };
  }, [paint]);

  return (
    <canvas
      ref={ref}
      className={className}
      role="img"
      aria-label={label ?? `The grove on day ${day}.`}
    />
  );
}
