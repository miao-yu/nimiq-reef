'use client';

import { useState } from 'react';
import { Avatar } from './Avatar';

/**
 * A validator's face: its registered logo, or its identicon.
 *
 * Roughly half the elected set has never registered with the public registry,
 * so the identicon is not a placeholder for a missing image — it is the right
 * answer for those, and the only thing that works for all of them.
 *
 * The logo is fetched one at a time from /validator/<address>/logo rather than
 * inlined, because the registry's images total about 1.4MB. If one 404s or
 * fails to decode, this falls back to the identicon rather than showing a
 * broken image.
 */
export function ValidatorMark({
  address,
  hasLogo,
  size = 32,
}: {
  address: string;
  hasLogo?: boolean;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (!hasLogo || failed) return <Avatar address={address} size={size} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/validator/${encodeURIComponent(address.replace(/\s/g, ''))}/logo`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      /*
       * A neutral disc behind the logo and `contain` rather than `cover`:
       * these are operator marks of every shape and tone, and a pale one on a
       * near-white card is invisible while a wide one gets cropped to nothing.
       */
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flex: 'none',
        objectFit: 'contain',
        background: 'var(--surface-2, #e1eaef)',
        padding: 2,
        boxSizing: 'border-box',
      }}
    />
  );
}
