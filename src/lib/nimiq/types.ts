/**
 * Where a signature can come from:
 *  - 'nimiq-pay' — running inside the Mini App host. The only one that can stake.
 *  - 'hub'       — the regular Nimiq Wallet in a browser. Real signatures, no staking.
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
  readonly kind: ProviderKind;
}
