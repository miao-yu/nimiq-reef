/**
 * Where a signature can come from:
 *  - 'nimiq-pay' — running inside the Mini App host. Builds and broadcasts itself.
 *  - 'hub'       — the regular Nimiq Wallet in a browser. Signs bytes the server
 *                  built, which the server then broadcasts.
 *  - 'mock'      — local dev only; /api/dev/wallet is 404 in production.
 */
export type ProviderKind = 'nimiq-pay' | 'hub' | 'mock';

/** The slice of the Nimiq Pay provider Reef actually uses. */
export interface SignatureResult {
  publicKey: string;
  signature: string;
}

export interface ReefProvider {
  listAccounts(): Promise<string[]>;
  sign(message: string): Promise<SignatureResult>;
  getBlockNumber(): Promise<number>;
  isConsensusEstablished(): Promise<boolean>;
  /** Delegate to a validator and open a staking position. */
  sendNewStakerTransaction(tx: { delegation: string; value: number }): Promise<string>;
  /** Add to an existing position. */
  sendStakeTransaction(tx: { value: number }): Promise<string>;
  /**
   * A pseudonymous, per-origin device identifier, or null outside Nimiq Pay.
   *
   * Stable across reinstalls *and across different accounts on the same
   * phone*, which is what makes it a usable rate limit where a wallet is not:
   * a wallet costs nothing to create.
   */
  deviceId(): Promise<string | null>;
  /**
   * Create a Nimiq account, for somebody who has none.
   *
   * Only the Hub offers this. Inside Nimiq Pay a wallet always exists, and the
   * mock invents one, so the absence of this method is what marks a provider
   * that has nothing to onboard.
   */
  onboard?(): Promise<void>;
  readonly kind: ProviderKind;
}
