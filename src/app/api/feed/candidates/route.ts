import { NextResponse } from 'next/server';
import { currentAddress } from '@/lib/server/session';
import { feedCandidates, gaveToday } from '@/lib/server/reef-repo';
import { deviceHash, isDeviceId } from '@/lib/server/device';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Three reefs nobody has fed today, weighted toward the quiet ones.
 *
 * Identified by handle. **No addresses in this payload** — a stranger has no
 * business learning whose wallet they are looking at, and nobody consented to
 * that when they signed in.
 */
export async function GET(request: Request) {
  const address = await currentAddress();
  if (!address) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const deviceId = new URL(request.url).searchParams.get('device');
  if (!isDeviceId(deviceId)) {
    return NextResponse.json(
      { error: 'Feeding other reefs needs Nimiq Pay.', reason: 'no-device' },
      { status: 400 },
    );
  }

  const hash = deviceHash(deviceId);
  if (await gaveToday(hash)) {
    return NextResponse.json({ candidates: [], gaveToday: true });
  }
  return NextResponse.json({
    candidates: await feedCandidates(address, hash),
    gaveToday: false,
  });
}
