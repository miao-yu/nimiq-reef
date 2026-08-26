import { NextResponse } from 'next/server';
import { rpc, RpcUnavailableError } from '@/lib/server/rpc';
import {
  allReefAddresses,
  recordDay,
  recordWalletActivity,
  recordTick,
} from '@/lib/server/reef-repo';
import { EPOCH_MS } from '@/lib/reef/charges';
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
  let epoch = 0;
  try {
    blockNumber = await rpc.getBlockNumber();
    epoch = await rpc.getEpochNumber();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    // Record the miss. A silent skip is indistinguishable from "nobody staked",
    // and reef_days would grow a hole nobody could explain later.
    await recordTick(null, 0, 0, message);
    return NextResponse.json({ error: 'Chain unreachable', detail: message }, { status: 503 });
  }

  // Charges are priced in epochs, so a protocol change to epoch length would
  // silently mis-price them. Notice it here rather than in a player's balance.
  const { Policy } = await import('@nimiq/core');
  const actualEpochMs = Number(Policy.BLOCK_SEPARATION_TIME) * Policy.BLOCKS_PER_EPOCH;
  const epochDrift = actualEpochMs !== EPOCH_MS ? `epoch is ${actualEpochMs}ms, charges assume ${EPOCH_MS}ms` : undefined;

  const addresses = await allReefAddresses();
  let staked = 0;
  let failures = 0;
  let bonuses = 0;

  for (let i = 0; i < addresses.length; i += CONCURRENCY) {
    const batch = addresses.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (address) => {
        try {
          const staker = await rpc.getStakerByAddress(address);
          const stakedLuna = staker ? Number(staker.balance) : 0;
          if (stakedLuna > 0) staked++;
          await recordDay(address, stakedLuna, staker?.delegation ?? null);

          // A wallet used during an epoch earns one extra charge for it.
          // Balance change is the proxy — see recordWalletActivity.
          const wallet = await rpc.getBalance(address);
          if (await recordWalletActivity(address, epoch, wallet)) bonuses++;
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
    [failures > 0 ? `${failures} address lookups failed` : undefined, epochDrift]
      .filter(Boolean)
      .join('; ') || undefined,
  );

  return NextResponse.json({ blockNumber, epoch, reefs: addresses.length, staked, bonuses, failures });
}
