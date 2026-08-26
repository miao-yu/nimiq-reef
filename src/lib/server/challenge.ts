import 'server-only';
import { randomBytes } from 'node:crypto';

/**
 * Single-use sign-in challenges.
 *
 * In memory, which is correct for one Node process on one VPS and nothing else.
 * If this ever runs behind more than one instance, move the store to MySQL or
 * Redis — otherwise a challenge issued by instance A cannot be consumed by
 * instance B, and sign-in fails intermittently in a way that is miserable to
 * debug. See docs/ARCHITECTURE.md.
 */

const TTL_MS = 5 * 60 * 1000;
const MAX_PENDING = 10_000;

interface Pending {
  address: string;
  message: string;
  expiresAt: number;
}

const pending = new Map<string, Pending>();

function sweep(now: number): void {
  for (const [code, entry] of pending) {
    if (entry.expiresAt <= now) pending.delete(code);
  }
}

export interface Challenge {
  code: string;
  /** Shown verbatim to the user in Nimiq Pay's approval dialog. */
  message: string;
  expiresAt: number;
}

export function issueChallenge(address: string): Challenge {
  const now = Date.now();
  sweep(now);
  // Cheap flood guard: a full table means someone is spraying challenges.
  if (pending.size >= MAX_PENDING) throw new Error('Too many pending challenges');

  const code = randomBytes(16).toString('hex');
  const expiresAt = now + TTL_MS;

  // Human-readable on purpose — the user reads this in the wallet before
  // approving, and binding the address and app name stops the signature being
  // replayed against a different app.
  const message = [
    'Sign in to Reef',
    `Address: ${address}`,
    `Code: ${code}`,
    'Valid for 5 minutes. Signing costs nothing and moves no NIM.',
  ].join('\n');

  pending.set(code, { address, message, expiresAt });
  return { code, message, expiresAt };
}

/** Returns the challenge and burns it. A second call with the same code fails. */
export function consumeChallenge(code: string, address: string): Pending | null {
  const now = Date.now();
  sweep(now);
  const entry = pending.get(code);
  if (!entry) return null;
  pending.delete(code);
  if (entry.expiresAt <= now) return null;
  if (entry.address !== address) return null;
  return entry;
}
