'use client';

import { useCallback, useEffect, useRef } from 'react';
import { paletteFromCss, renderTank, type Inhabitant } from '@/lib/tank';

interface TankProps {
  inhabitants: readonly Inhabitant[];
  /** 0..1 of the glass that holds water. From stake amount only. */
  waterLevel: number;
  /** Feedings received today — draws the flakes somebody else dropped in. */
  feedings?: number;
  className?: string;
  label?: string;
}

export function Tank({ inhabitants, waterLevel, feedings, className, label }: TankProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const size = useRef({ w: 0, h: 0 });
  const frame = useRef<number | null>(null);
  const started = useRef<number>(0);
  /**
   * The level actually drawn, easing toward the real one.
   *
   * Depth is log-scaled, so doubling a stake from 1,000 to 2,000 NIM moves the
   * waterline about eleven pixels — invisible if it simply appears at the new
   * height, and unmissable if you watch it rise. The easing is the whole point:
   * it turns a change too small to see into a moment you notice.
   */
  const shown = useRef<number>(waterLevel);

  const paint = useCallback(
    (time: number, motion: boolean) => {
      const canvas = ref.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const { w, h } = size.current;
      if (w === 0 || h === 0) return;

      if (motion) {
        // Exponential ease. Settles in a couple of seconds and never
        // overshoots, so a falling level reads as draining rather than sloshing.
        const gap = waterLevel - shown.current;
        shown.current += gap * 0.035;
        if (Math.abs(gap) < 0.0004) shown.current = waterLevel;
      } else {
        shown.current = waterLevel;
      }

      renderTank(ctx, {
        width: w,
        height: h,
        time,
        inhabitants,
        palette: paletteFromCss(),
        waterLevel: shown.current,
        feedings,
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
