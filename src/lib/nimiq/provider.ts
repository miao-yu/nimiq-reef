'use client';

import type { ReefProvider } from './types';
import { createMockProvider } from './mock';
import { createHubProvider } from './hub';

let cached: Promise<ReefProvider> | undefined;

/**
 * Pick a signing provider, best first.
 *
 *   1. Nimiq Pay, when the Mini App host injected `window.nimiq`.
 *   2. The Nimiq Wallet Hub, in an ordinary browser — real wallet, real
 *      signatures, no staking.
 *   3. The dev mock, and only in development.
 *
 * `init()` waits for the host to inject the provider, so outside Nimiq Pay it
 * can only ever time out. Keep that wait short rather than making browser users
 * sit through it.
 */
export function getProvider(): Promise<ReefProvider> {
  cached ??= resolve();
  return cached;
}

/** Forget the cached choice — used when a sign-in attempt fails and we retry. */
export function resetProvider(): void {
  cached = undefined;
}

async function resolve(): Promise<ReefProvider> {
  try {
    const { init } = await import('@nimiq/mini-app-sdk');
    const nimiq = await init({ timeout: 1500 });

    return {
      kind: 'nimiq-pay',
      listAccounts: async () => unwrap(await nimiq.listAccounts()),
      sign: async (message) => unwrap(await nimiq.sign(message)),
      getBlockNumber: () => nimiq.getBlockNumber(),
      isConsensusEstablished: () => nimiq.isConsensusEstablished(),
      sendNewStakerTransaction: async (tx) => unwrap(await nimiq.sendNewStakerTransaction(tx)),
      sendStakeTransaction: async (tx) => unwrap(await nimiq.sendStakeTransaction(tx)),
    };
  } catch {
    // Not inside Nimiq Pay. In production the Hub is the only real option; the
    // mock exists so local development does not need a wallet at all.
    if (process.env.NODE_ENV === 'production') return createHubProvider();
    return createMockProvider();
  }
}

/** The provider resolves errors instead of rejecting them. Turn that back. */
function unwrap<T>(value: T | { error: { type: string; message: string } }): T {
  if (value && typeof value === 'object' && 'error' in value) {
    throw new Error((value as { error: { message: string } }).error.message);
  }
  return value as T;
}
