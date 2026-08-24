import 'server-only';
import { createHash } from 'node:crypto';

/**
 * What bytes did Nimiq Pay actually sign?
 *
 * `@nimiq/mini-app-sdk` forwards `sign()` to the host untouched — it applies no
 * prefix of its own — so the wrapping is decided inside the native app, which we
 * cannot inspect from here. Rather than guess, verification tries each known
 * convention and reports which one matched.
 *
 * ACTION REQUIRED: on the first successful sign-in from a real device, read the
 * `encoding` in the log line and pin it here by deleting the others. Accepting
 * multiple encodings forever widens the attack surface for no benefit.
 */

const HUB_PREFIX = '\x16Nimiq Signed Message:\n';

export interface Candidate {
  label: string;
  bytes: Uint8Array;
}

export function candidateDigests(message: string): Candidate[] {
  const utf8 = new TextEncoder().encode(message);

  // Nimiq Hub / Keyguard convention: prefix, then byte length, then the
  // message; sign the SHA-256 of that.
  const framed = Buffer.concat([
    Buffer.from(HUB_PREFIX, 'utf8'),
    Buffer.from(String(utf8.length), 'utf8'),
    Buffer.from(utf8),
  ]);
  const hubDigest = new Uint8Array(createHash('sha256').update(framed).digest());

  return [
    { label: 'hub-prefixed-sha256', bytes: hubDigest },
    { label: 'raw-utf8', bytes: utf8 },
  ];
}
