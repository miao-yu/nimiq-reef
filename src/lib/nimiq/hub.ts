'use client';

import HubApi from '@nimiq/hub-api';
import type { GroveProvider, SignatureResult } from './types';

/**
 * Sign-in through the regular Nimiq Wallet (Hub), for browsers outside Nimiq Pay.
 *
 * The Hub frames signed messages as
 *   HubApi.MSG_PREFIX + byteLength + message, hashed with SHA-256
 * which is exactly the `hub-prefixed-sha256` candidate in
 * src/lib/server/signed-message.ts. So a successful sign-in here validates that
 * candidate against a real wallet.
 *
 * It does NOT tell us what Nimiq Pay does. The Mini App SDK forwards `sign()`
 * to native code we cannot read, and it may frame differently. Only an
 * on-device sign-in settles that. See docs/RESEARCH.md.
 */

const APP_NAME = 'Reef';

/**
 * Pin the endpoint. HubApi picks a default from the page's hostname and falls
 * back to http://localhost:8080 for anything it does not recognise as a Nimiq
 * domain — which reef.nimiq.cafe is not, so sign-in silently pointed at a dev
 * server that is not there.
 */
const HUB_ENDPOINT = 'https://hub.nimiq.com';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function createHubProvider(): GroveProvider {
  const hub = new HubApi(HUB_ENDPOINT);
  let chosen: string | undefined;

  async function address(): Promise<string> {
    if (!chosen) {
      const result = await hub.chooseAddress({ appName: APP_NAME });
      chosen = result.address;
    }
    return chosen;
  }

  return {
    kind: 'hub',
    async listAccounts() {
      return [await address()];
    },
    async sign(message: string): Promise<SignatureResult> {
      const signed = await hub.signMessage({ appName: APP_NAME, signer: chosen, message });
      // The Hub reports which address signed. Trust that over anything cached,
      // so a user who switches account mid-flow signs in as who they actually are.
      chosen = signed.signer;
      return {
        publicKey: toHex(signed.signerPublicKey),
        signature: toHex(signed.signature),
      };
    },
    async getBlockNumber() {
      return 0;
    },
    async isConsensusEstablished() {
      return true;
    },
    // The Hub *can* stake — signStaking() exists — but it takes a pre-built
    // serialised transaction and returns a signed one for us to broadcast,
    // where Nimiq Pay does all of that itself. Building it here would mean
    // shipping @nimiq/core's WASM to a mobile-first bundle plus a broadcast
    // endpoint, so it is deferred rather than impossible.
    //
    // It is also not needed: Reef reads the chain, so a delegation made in the
    // Nimiq Wallet lands in the tank on the next tick regardless.
    async sendNewStakerTransaction() {
      throw new Error('BROWSER_STAKING_UNAVAILABLE');
    },
    async sendStakeTransaction() {
      throw new Error('BROWSER_STAKING_UNAVAILABLE');
    },
  };
}

/** The Hub needs a real browser with popups; it cannot work server-side. */
export function hubAvailable(): boolean {
  return typeof window !== 'undefined';
}
