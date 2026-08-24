import 'server-only';
import { env } from './env';

/**
 * Nimiq Albatross JSON-RPC.
 *
 * Shapes below are taken from core-rs-albatross v1.7.2
 * (`rpc-interface/src/types.rs`), not from the docs. Responses wrap the payload
 * one level deeper than plain JSON-RPC — the value lives at `result.data`.
 */

/** The node is unreachable or broken. Distinct from "this address isn't a staker". */
export class RpcUnavailableError extends Error {
  constructor(method: string, cause: string) {
    super(`Nimiq RPC ${method} unavailable: ${cause}`);
    this.name = 'RpcUnavailableError';
  }
}

interface RpcEnvelope<T> {
  result?: { data: T };
  error?: { code?: number; message: string; data?: string };
}

async function call<T>(method: string, params: unknown[] = []): Promise<T> {
  let response: Response;
  try {
    response = await fetch(env.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
      cache: 'no-store',
    });
  } catch (cause) {
    throw new RpcUnavailableError(method, cause instanceof Error ? cause.message : 'fetch failed');
  }

  if (!response.ok) throw new RpcUnavailableError(method, `HTTP ${response.status}`);

  const body = (await response.json()) as RpcEnvelope<T>;
  // A JSON-RPC error means the node answered and said no — an application-level
  // result, not an outage. Callers decide what it means.
  if (body.error) throw new Error(body.error.data ?? body.error.message);
  if (!body.result) throw new RpcUnavailableError(method, 'no result in response');
  return body.result.data;
}

/** Amounts are Luna. 1 NIM = 1e5 Luna. */
export interface Staker {
  address: string;
  balance: number;
  delegation: string | null;
  inactiveBalance: number;
  /** Block number the stake became inactive, or null while fully active. */
  inactiveFrom: number | null;
  retiredBalance: number;
}

export interface ActiveValidator {
  address: string;
  balance: number;
  numStakers: number;
}

export const rpc = {
  /**
   * The current epoch's elected validators. Unlike getValidators and
   * getStakersByValidatorAddress, this one carries no "extremely expensive"
   * warning in the node source and returns in milliseconds — measured at ~13ms
   * for 37 validators — so it is safe to serve from a request.
   */
  getActiveValidators: () => call<ActiveValidator[]>('getActiveValidators'),

  getBlockNumber: () => call<number>('getBlockNumber'),
  getEpochNumber: () => call<number>('getEpochNumber'),
  isConsensusEstablished: () => call<boolean>('isConsensusEstablished'),

  /**
   * Null when the address has never staked — a wallet on the free tier.
   * Only a node outage throws, so a node going down can never be mistaken for
   * every player having unstaked.
   */
  async getStakerByAddress(address: string): Promise<Staker | null> {
    try {
      return await call<Staker>('getStakerByAddress', [address]);
    } catch (error) {
      if (error instanceof RpcUnavailableError) throw error;
      return null;
    }
  },

  call,
};

/**
 * Deliberately not exposed: `getStakersByValidatorAddress`.
 *
 * core-rs-albatross marks it "extremely computationally expensive" — it walks
 * every staker in the staking contract. The pool can afford it once per epoch;
 * a web request cannot, and Grove is validator-neutral so there is no single
 * validator to enumerate anyway. Always look up one staker by address.
 */
