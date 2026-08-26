'use client';

import { useCallback, useEffect, useRef } from 'react';
import { paletteFromCss, renderTank, type Inhabitant } from '@/lib/tank';

interface TankProps {
  inhabitants: readonly Inhabitant[];
  /** 0..1 of the glass that holds water. From stake amount only. */
  waterLevel: number;
  className?: string;
  label?: string;
}

export function Tank({ inhabitants, waterLevel, className, label }: TankProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const size = useRef({ w: 0, h: 0 });
  const frame = useRef<number | null>(null);
  const started = useRef<number>(0);

  const paint = useCallback(
    (time: number, motion: boolean) => {
      const canvas = ref.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const { w, h } = size.current;
      if (w === 0 || h === 0) return;
      renderTank(ctx, {
        width: w,
        height: h,
        time,
        inhabitants,
        palette: paletteFromCss(),
        waterLevel,
        motion,
      });
    },
    [inhabitants, waterLevel],
  );

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
  }, []);

  useEffect(() => {
    fit();
    const observer = new ResizeObserver(fit);
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [fit]);

  // The animation loop. Position is a pure function of elapsed time, so a
  // dropped frame or a remount never teleports anything — it simply resumes.
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');

    const start = () => {
      if (media.matches) {
        paint(0, false);
        return;
      }
      if (started.current === 0) started.current = performance.now();
      const step = (now: number) => {
        paint((now - started.current) / 1000, true);
        frame.current = requestAnimationFrame(step);
      };
      frame.current = requestAnimationFrame(step);
    };

    const stop = () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };

    start();
    media.addEventListener('change', () => {
      stop();
      start();
    });

    // Nothing to animate for a tab nobody is looking at.
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [paint]);

  return (
    <canvas
      ref={ref}
      className={className}
      role="img"
      aria-label={label ?? `An aquarium with ${inhabitants.length} inhabitants.`}
    />
  );
}
