import { NextResponse } from 'next/server';
import { rpc, RpcUnavailableError } from '@/lib/server/rpc';
import { allGroveAddresses, recordDay, recordTick } from '@/lib/server/grove-repo';
import { env } from '@/lib/server/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Small enough not to bother the node, large enough to finish quickly. */
const CONCURRENCY = 4;

/**
 * The watering. Driven by a systemd timer every 15 minutes — the same cadence
 * the pool's payout job already runs at.
 *
 * Only ever calls getStakerByAddress, which is a single lookup. Never
 * getStakersByValidatorAddress: the node marks that one extremely expensive
 * because it walks the whole staking contract.
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${env.tickSecret}`) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let blockNumber: number | null = null;
  try {
    blockNumber = await rpc.getBlockNumber();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    // Record the miss. A silent skip is indistinguishable from "nobody staked",
    // and grove_days would grow a hole nobody could explain later.
    await recordTick(null, 0, 0, message);
    return NextResponse.json({ error: 'Chain unreachable', detail: message }, { status: 503 });
  }

  const addresses = await allGroveAddresses();
  let staked = 0;
  let failures = 0;

  for (let i = 0; i < addresses.length; i += CONCURRENCY) {
    const batch = addresses.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (address) => {
        try {
          const staker = await rpc.getStakerByAddress(address);
          const balance = staker ? Number(staker.balance) : 0;
          if (balance > 0) staked++;
          await recordDay(address, balance, staker?.delegation ?? null);
        } catch (error) {
          // One address failing must not abandon the rest of the run.
          if (error instanceof RpcUnavailableError) failures++;
          else throw error;
        }
      }),
    );
  }

  await recordTick(
    blockNumber,
    addresses.length,
    staked,
    failures > 0 ? `${failures} address lookups failed` : undefined,
  );

  return NextResponse.json({ blockNumber, groves: addresses.length, staked, failures });
}
