import { NextResponse } from 'next/server';
import { currentAddress } from '@/lib/server/session';
import { feedOther } from '@/lib/server/reef-repo';
import { getReefState } from '@/lib/server/reef-state';
import { deviceHash, isDeviceId } from '@/lib/server/device';
import { formatAddress, normalizeAddress } from '@/lib/nimiq/address';

export const runtime = 'nodejs';

/**
 * Feed somebody else's reef. One per device per UTC day.
 *
 * Gated on the device rather than the wallet, and refused outright without a
 * device identifier rather than falling back to something weaker — a fallback
 * would just be the farm we are trying to stop, wearing a different hat.
 */
export async function POST(request: Request) {
  const address = await currentAddress();
  if (!address) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  let body: { address?: unknown; device?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const target = normalizeAddress(body.address);
  if (!target) return NextResponse.json({ error: 'Which reef?' }, { status: 400 });

  // A device identifier is the strong limit and Nimiq Pay is the only source of
  // one. Outside it we fall back to the signed-in address, which is weaker —
  // a wallet costs nothing to create — and so is allowed only for a reef the
  // user reached deliberately, never for the candidates we hand out.
  const limiter = isDeviceId(body.device) ? deviceHash(body.device) : deviceHash(`address:${address}`);

  const outcome = await feedOther(address, formatAddress(target), limiter);
  if (outcome === 'unknown-reef') {
    return NextResponse.json({ error: 'No reef by that name.' }, { status: 404 });
  }
  if (outcome === 'own-reef') {
    return NextResponse.json({ error: 'That one is yours.' }, { status: 400 });
  }
  if (outcome === 'already-fed-today') {
    return NextResponse.json(
      { error: 'You have already fed a reef today. One a day.' },
      { status: 409 },
    );
  }

  return NextResponse.json({ fed: formatAddress(target), reef: await getReefState(address) });
}
