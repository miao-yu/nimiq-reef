import 'server-only';
import { env } from './env';

/**
 * Nimiq Albatross JSON-RPC. Responses wrap the payload one level deeper than
 * plain JSON-RPC — the value lives at `result.data`.
 */
interface RpcEnvelope<T> {
  result?: { data: T };
  error?: { code: number; message: string };
}

async function call<T>(method: string, params: unknown[] = []): Promise<T> {
  const response = await fetch(env.rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Nimiq RPC ${method} failed: HTTP ${response.status}`);
  }

  const body = (await response.json()) as RpcEnvelope<T>;
  if (body.error) throw new Error(`Nimiq RPC ${method} failed: ${body.error.message}`);
  if (!body.result) throw new Error(`Nimiq RPC ${method} returned no result`);
  return body.result.data;
}

export interface Staker {
  address: string;
  balance: number;
  delegation: string | null;
  inactiveBalance: number;
  retiredBalance: number;
}

export const rpc = {
  getBlockNumber: () => call<number>('getBlockNumber'),
  getEpochNumber: () => call<number>('getEpochNumber'),
  isConsensusEstablished: () => call<boolean>('isConsensusEstablished'),
  /** Null when the address has never staked — a wallet on the free tier. */
  getStakerByAddress: async (address: string): Promise<Staker | null> => {
    try {
      return await call<Staker>('getStakerByAddress', [address]);
    } catch {
      return null;
    }
  },
  call,
};
