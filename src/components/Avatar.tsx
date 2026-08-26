'use client';

import { useEffect, useMemo, useState } from 'react';
import { identiconFor } from '@/lib/nimiq/identicon';

/**
 * The Nimiq identicon for an address — the same face the Nimiq Wallet shows.
 *
 * The artwork lives in public/identicons.svg, fetched once and cached by the
 * browser, rather than bundled into the JavaScript a phone parses on every
 * load. Parts come from our own static file, never from user input, so
 * inlining their markup is safe.
 */
const HEXAGON =
  'M251.6 17.34l63.53 110.03c5.72 9.9 5.72 22.1 0 32L251.6 269.4c-5.7 9.9-16.27 16-27.7 16H96.83' +
  'c-11.43 0-22-6.1-27.7-16L5.6 159.37c-5.7-9.9-5.7-22.1 0-32L69.14 17.34c5.72-9.9 16.28-16 27.7-16' +
  'H223.9c11.43 0 22 6.1 27.7 16z';

const SHADOW =
  'M119.21,80a39.46,39.46,0,0,1-67.13,28.13c10.36,2.33,36,3,49.82-14.28,10.39-12.47,8.31-33.23,' +
  '4.16-43.26A39.35,39.35,0,0,1,119.21,80Z';

let spritePromise: Promise<Document | null> | undefined;

/** One fetch per page, shared by every avatar on it. */
function sprite(): Promise<Document | null> {
  spritePromise ??= fetch('/identicons.svg')
    .then((r) => (r.ok ? r.text() : null))
    .then((text) => (text ? new DOMParser().parseFromString(text, 'image/svg+xml') : null))
    .catch(() => null);
  return spritePromise;
}

export function Avatar({ address, size = 40 }: { address: string; size?: number }) {
  const icon = useMemo(() => identiconFor(address), [address]);
  const [parts, setParts] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void sprite().then((doc) => {
      if (!alive || !doc) return;
      // Order matters: top and side sit behind the face, bottom in front.
      const html = (['top', 'side', 'face', 'bottom'] as const)
        .map((part) => doc.getElementById(icon.parts[part])?.innerHTML ?? '')
        .join('');
      setParts(html);
    });
    return () => {
      alive = false;
    };
  }, [icon]);

  // A plain coloured hexagon until the sprite lands — the right colours from
  // the first paint, so nothing shifts hue when the artwork arrives.
  const clipId = `hex-${icon.parts.face}-${icon.parts.top}`;

  return (
    <svg
      viewBox="0 0 160 160"
      width={size}
      height={size}
      style={{ flex: 'none', display: 'block' }}
      role="img"
      aria-label={`Identicon for ${address}`}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={HEXAGON} transform="scale(0.5) translate(0, 16)" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <g color={icon.main} fill={icon.accent}>
          <rect fill={icon.background} x="0" y="0" width="160" height="160" />
          <circle cx="80" cy="80" r="40" fill={icon.main} />
          <g opacity=".1" fill="#010101">
            <path d={SHADOW} />
          </g>
          {parts ? <g dangerouslySetInnerHTML={{ __html: parts }} /> : null}
        </g>
      </g>
    </svg>
  );
}
