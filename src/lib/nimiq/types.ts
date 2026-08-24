/** The slice of the Nimiq Pay provider Grove actually uses. */
export interface SignatureResult {
  publicKey: string;
  signature: string;
}

export interface GroveProvider {
  listAccounts(): Promise<string[]>;
  sign(message: string): Promise<SignatureResult>;
  getBlockNumber(): Promise<number>;
  isConsensusEstablished(): Promise<boolean>;
  /** Delegate to a validator and open a staking position. */
  sendNewStakerTransaction(tx: { delegation: string; value: number }): Promise<string>;
  /** Add to an existing position. */
  sendStakeTransaction(tx: { value: number }): Promise<string>;
  readonly isMock: boolean;
}
