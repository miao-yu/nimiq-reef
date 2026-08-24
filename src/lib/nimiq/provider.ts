'use client';

import type { GroveProvider } from './types';
import { createMockProvider } from './mock';

let cached: Promise<GroveProvider> | undefined;

/**
 * The Nimiq Pay provider when running inside the app, a mock when not.
 *
 * `init()` from @nimiq/mini-app-sdk waits for the host to inject
 * `window.nimiq`, so outside Nimiq Pay it can only time out. We keep that wait
 * short and fall back, rather than making desktop development sit through it.
 */
export function getProvider(): Promise<GroveProvider> {
  cached ??= resolve();
  return cached;
}

async function resolve(): Promise<GroveProvider> {
  try {
    const { init } = await import('@nimiq/mini-app-sdk');
    const nimiq = await init({ timeout: 1500 });

    return {
      isMock: false,
      listAccounts: async () => unwrap(await nimiq.listAccounts()),
      sign: async (message) => unwrap(await nimiq.sign(message)),
      getBlockNumber: () => nimiq.getBlockNumber(),
      isConsensusEstablished: () => nimiq.isConsensusEstablished(),
      sendNewStakerTransaction: async (tx) => unwrap(await nimiq.sendNewStakerTransaction(tx)),
      sendStakeTransaction: async (tx) => unwrap(await nimiq.sendStakeTransaction(tx)),
    };
  } catch {
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
