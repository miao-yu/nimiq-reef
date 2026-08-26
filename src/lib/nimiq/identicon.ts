/**
 * The Nimiq identicon, reimplemented.
 *
 * Same algorithm and same artwork as @nimiq/identicons, so a reef wears the
 * face its owner already recognises from the Nimiq Wallet. Not the package
 * itself: that ships an 88KB bundle into the JavaScript payload, artwork and
 * all, which a phone then parses on every load. Here the logic is ~40 lines and
 * the sprite is a static file the browser fetches once and caches.
 *
 * Algorithm recovered from identicons@1.6.2:
 *   hash = makeHash(address)                     13 digits
 *   main colour       hash[0]
 *   background colour hash[2]
 *   face  / top / side / bottom  hash[3..4] / [5..6] / [7..8] / [9..10]
 *   accent colour     hash[11]
 *   part index = (n % 21) + 1, zero padded
 *
 * Licence for the artwork is in public/identicons.LICENSE.txt.
 */

export const COLORS = [
  '#FC8702', '#D94432', '#E9B213', '#1A5493', '#0582CA',
  '#5961A8', '#21BCA5', '#FA7268', '#88B04B', '#795548',
] as const;

export const BACKGROUND_COLORS = [
  '#FC8702', '#D94432', '#E9B213', '#1F2348', '#0582CA',
  '#5F4B8B', '#21BCA5', '#FA7268', '#88B04B', '#795548',
] as const;

export const COLOR_NAMES = [
  'Orange', 'Red', 'Yellow', 'Indigo', 'Blue',
  'Purple', 'Teal', 'Pink', 'Green', 'Brown',
] as const;

/** A logistic-map iteration. Deliberately identical to the original. */
function chaosHash(n: number): number {
  let r = 1 / n;
  for (let i = 0; i < 100; i++) r = (1 - r) * r * 3.569956786876;
  return r;
}

function padEnd(value: string, length: number, pad: string): string {
  let out = value;
  while (out.length < length) out += pad;
  return out.substring(0, Math.max(out.length, length));
}

export function makeHash(address: string): string {
  const reversed = String(
    address
      .split('')
      .map((c) => c.charCodeAt(0) + 3)
      .reduce((acc, n) => acc * (1 - acc) * chaosHash(n), 0.5),
  )
    .split('')
    .reduce((acc, c) => c + acc, '');
  return padEnd(reversed.replace('.', reversed[5]!).substr(4, 17), 13, reversed[5]!);
}

/**
 * Colours must all differ, or the face disappears into its own background.
 * The nudging rules are the original's, kept exactly so output matches.
 */
function indices(main: number, background: number, accent: number) {
  let m = main;
  let a = accent;
  if (m === background && ++m > 9) m = 0;
  while (a === m || a === background) if (++a > 9) a = 0;
  return { main: m, background, accent: a };
}

export interface Identicon {
  main: string;
  background: string;
  accent: string;
  /** Sprite ids, e.g. `face_07`. */
  parts: { face: string; top: string; side: string; bottom: string };
  backgroundName: string;
}

const assetId = (digits: string, part: string) =>
  `${part}_${String((Number(digits) % 21) + 1).padStart(2, '0')}`;

export function identiconFor(address: string): Identicon {
  const h = makeHash(address);
  const i = indices(parseInt(h[0]!, 10), parseInt(h[2]!, 10), parseInt(h[11]!, 10));
  return {
    main: COLORS[i.main]!,
    background: BACKGROUND_COLORS[i.background]!,
    accent: COLORS[i.accent]!,
    backgroundName: COLOR_NAMES[i.background]!,
    parts: {
      face: assetId(h[3]! + h[4]!, 'face'),
      top: assetId(h[5]! + h[6]!, 'top'),
      side: assetId(h[7]! + h[8]!, 'side'),
      bottom: assetId(h[9]! + h[10]!, 'bottom'),
    },
  };
}
