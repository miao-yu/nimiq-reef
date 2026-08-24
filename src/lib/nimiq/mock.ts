import type { GroveProvider, SignatureResult } from './types';

/**
 * Stand-in for Nimiq Pay so the app is developable in a desktop browser.
 *
 * Signing is delegated to /api/dev/wallet, which holds a throwaway key. That
 * means sign-in runs through the real verifier — same signature check, same
 * address derivation — instead of being stubbed out, so a broken auth path
 * fails here rather than on a phone the night before the deadline.
 *
 * The dev wallet signs raw UTF-8. Nimiq Pay may frame the message differently;
 * `encoding=raw-utf8` in a dev log proves nothing about the device. See
 * src/lib/server/signed-message.ts.
 */
export function createMockProvider(): GroveProvider {
  let cached: string | undefined;

  async function address(): Promise<string> {
    if (!cached) {
      const res = await fetch('/api/dev/wallet');
      if (!res.ok) throw new Error('Dev wallet unavailable. Is NODE_ENV development?');
      cached = ((await res.json()) as { address: string }).address;
    }
    return cached;
  }

  return {
    isMock: true,
    async listAccounts() {
      return [await address()];
    },
    async sign(message: string): Promise<SignatureResult> {
      const res = await fetch('/api/dev/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error('Dev wallet could not sign.');
      return (await res.json()) as SignatureResult;
    },
    async getBlockNumber() {
      return 0;
    },
    async isConsensusEstablished() {
      return true;
    },
    async sendNewStakerTransaction() {
      throw new Error('Staking needs a real wallet — open this inside Nimiq Pay.');
    },
    async sendStakeTransaction() {
      throw new Error('Staking needs a real wallet — open this inside Nimiq Pay.');
    },
  };
}
