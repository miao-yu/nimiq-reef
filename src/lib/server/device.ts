import 'server-only';
import { createHash } from 'node:crypto';
import { env } from './env';

/**
 * The device identifier arrives from `requestDeviceIdentifier()` in the SDK —
 * already a pseudonymous, per-origin SHA-256 that cannot be correlated across
 * Mini Apps. We hash it again with the session secret before storing, so a
 * database copy alone cannot be matched against the value a device holds.
 *
 * Rate limits ride on this rather than on the wallet: a wallet is free to
 * create, while this identifier is stable across reinstalls *and across
 * different accounts on the same phone*, which is exactly the farm to stop.
 */
export function deviceHash(deviceId: string): string {
  return createHash('sha256').update(`${env.sessionSecret}:${deviceId}`).digest('hex');
}

/** Reject anything that is not the 64-char hex the SDK documents. */
export function isDeviceId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);
}
