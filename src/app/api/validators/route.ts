import { NextResponse } from 'next/server';
import { rpc, RpcUnavailableError, type ActiveValidator } from '@/lib/server/rpc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The elected validator set, for choosing where to delegate.
 *
 * Reef is validator-neutral: this lists everyone the chain elected, sorted by
 * address so the ordering carries no opinion. Our own pool gets no default, no
 * highlight, and no preferential position.
 *
 * Cached because the set only changes at an epoch boundary — every 12 hours
 * (43,200 blocks at one second each).
 */
const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; data: ActiveValidator[] } | undefined;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json({ validators: cache.data, cached: true });
  }

  try {
    const validators = (await rpc.getActiveValidators())
      .map((v) => ({ address: v.address, balance: Number(v.balance), numStakers: Number(v.numStakers) }))
      .sort((a, b) => a.address.localeCompare(b.address));
    cache = { at: Date.now(), data: validators };
    return NextResponse.json({ validators, cached: false });
  } catch (error) {
    if (cache) {
      // Serving a slightly stale list beats an empty picker during an outage.
      return NextResponse.json({ validators: cache.data, cached: true, stale: true });
    }
    if (error instanceof RpcUnavailableError) {
      return NextResponse.json({ error: 'Chain unreachable.' }, { status: 503 });
    }
    throw error;
  }
}
