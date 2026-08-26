/**
 * mulberry32 — small deterministic PRNG.
 *
 * Every plant carries a seed so its wobble, lean and petal placement are
 * identical on every repaint, across reloads, and between the browser and the
 * server-side share-image renderer. Never use Math.random() in the renderer.
 */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** easeOutCubic — growth is fast at first, then settles. */
export function ease(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
