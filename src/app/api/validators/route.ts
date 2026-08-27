import { NextResponse } from 'next/server';
import { rpc, RpcUnavailableError, type ElectedValidator } from '@/lib/server/rpc';
import { registry } from '@/lib/server/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The validators elected for this epoch, for choosing where to delegate.
 *
 * Elected, not merely active: getActiveValidators returns everything that is
 * not deactivated, which is a larger set than the election actually chose.
 *
 * Reef is validator-neutral: this lists everyone the chain elected, sorted by
 * address so the ordering carries no opinion. Our own pool gets no default, no
 * highlight, and no preferential position.
 *
 * Cached because the set only changes at an epoch boundary — every 12 hours
 * (43,200 blocks at one second each).
 */
const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; data: (ElectedValidator & { name: string | null })[] } | undefined;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json({ validators: cache.data, cached: true });
  }

  try {
    const [elected, known] = await Promise.all([rpc.electedValidators(), registry()]);
    const validators = elected
      .map((v) => ({
        address: v.address,
        balance: Number(v.balance),
        numStakers: Number(v.numStakers),
        numSlots: Number(v.numSlots),
        name: known.get(v.address.replace(/\s+/g, '').toUpperCase())?.name ?? null,
      }))
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
