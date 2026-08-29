import { NextResponse } from 'next/server';
import { currentAddress } from '@/lib/server/session';
import { feedCandidates, fedOtherToday } from '@/lib/server/reef-repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Three reefs nobody has fed today, weighted toward the quiet ones.
 *
 * Identified by address, which is what draws the identicon. That discloses
 * nothing new: stake and staking history are already readable from any Nimiq
 * node for anybody who has the address.
 *
 * This used to demand a device identifier and refuse without one, which made
 * the whole feature dark outside Nimiq Pay — a desktop visitor was told to go
 * and get an app. The limit is the wallet now, so the door is the same one
 * everywhere.
 */
export async function GET() {
  const address = await currentAddress();
  if (!address) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  if (await fedOtherToday(address)) {
    return NextResponse.json({ candidates: [], gaveToday: true });
  }
  return NextResponse.json({ candidates: await feedCandidates(address), gaveToday: false });
}
