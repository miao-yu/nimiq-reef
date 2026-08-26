'use client';

import HubApi from '@nimiq/hub-api';
import type { ReefProvider, SignatureResult } from './types';

/**
 * Sign-in through the regular Nimiq Wallet (Hub), for browsers outside Nimiq Pay.
 *
 * It can also stake: `signStaking` takes serialised bytes, so the server builds
 * the transaction and broadcasts the signed result. See src/lib/server/staking.ts.
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

export function createHubProvider(): ReefProvider {
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
    // Only the Mini App host can vouch for a device.
    deviceId: async () => null,
    async listAccounts() {
      return [await address()];
    },
    // The Hub's own create / import flow. chooseAddress() assumes an account
    // already exists, so without this a newcomer opens the wallet and finds
    // nothing to choose — a dead end at the very first step.
    async onboard() {
      await hub.onboard({ appName: APP_NAME });
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
    // Staking in a browser, in three steps: the server builds the bytes, the
    // Hub signs them, the server broadcasts. `signStaking` takes a serialised
    // transaction from anywhere, which is what makes this possible without
    // shipping @nimiq/core's WebAssembly to the page.
    async sendNewStakerTransaction({ delegation, value }) {
      return stake(hub, { value, delegation });
    },
    async sendStakeTransaction({ value }) {
      return stake(hub, { value });
    },
  };
}

interface StakeRequest {
  value: number;
  delegation?: string;
}

/**
 * Build, sign, broadcast.
 *
 * The Hub returns an array because a staking action can take more than one
 * transaction; every one it hands back is relayed, and the server checks each
 * came from this address and goes to the staking contract before it does.
 */
async function stake(hub: HubApi, request: StakeRequest): Promise<string> {
  const built = await post<{ raw: string; kind: string }>('/api/stake/build', {
    value: request.value,
    delegation: request.delegation ?? null,
  });

  const signed = await hub.signStaking({
    appName: APP_NAME,
    // The Hub shows these next to the addresses it is asking about, so a user
    // can tell what they are agreeing to without decoding an address.
    senderLabel: 'Your wallet',
    recipientLabel: 'Nimiq staking',
    transaction: hexToBytes(built.raw),
  });

  const { hashes } = await post<{ hashes: string[] }>('/api/stake/send', {
    raw: signed.map((tx) => tx.serializedTx),
  });
  return hashes[0] ?? '';
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? 'The request failed.');
  return data;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** The Hub needs a real browser with popups; it cannot work server-side. */
export function hubAvailable(): boolean {
  return typeof window !== 'undefined';
}
