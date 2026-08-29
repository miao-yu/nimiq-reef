import { NextResponse } from 'next/server';
import { currentAddress } from '@/lib/server/session';
import { ensureReef, feedOther, grantFedCharge } from '@/lib/server/reef-repo';
import { rpc, RpcUnavailableError } from '@/lib/server/rpc';
import { getReefState } from '@/lib/server/reef-state';
import { formatAddress, normalizeAddress } from '@/lib/nimiq/address';

export const runtime = 'nodejs';

/**
 * Feed somebody else's reef. One per wallet per UTC day.
 *
 * The limit rode on a device identifier until it was clear what it was
 * buying: bonus_charges is UNIQUE (address, day, reason), so a reef collects
 * one 'fed' charge a day however many feeds arrive, and giving earns the
 * giver nothing. Farming wallets bought a bigger vanity counter and cost the
 * farmer discoverability, since the quiet sort ranks by fewest feeds.
 */
export async function POST(request: Request) {
  const address = await currentAddress();
  if (!address) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  let body: { address?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const target = normalizeAddress(body.address);
  if (!target) return NextResponse.json({ error: 'Which reef?' }, { status: 400 });

  /*
   * The giver needs a reef row before the foreign key will accept them.
   *
   * Signing in happens on the home screen, which loads /api/reef and creates
   * it — so this held right up until feeding became reachable from the
   * community list and a reef page, where somebody can arrive and act without
   * ever having loaded their own. It failed as a 500 and an unparseable body,
   * not as a refusal.
   */
  await ensureReef(address);

  const outcome = await feedOther(address, formatAddress(target));
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

  // The charge is the recipient's, not the giver's. Best effort: if the node
  // is unreachable we cannot say which epoch this is, and a feeding that
  // happened is not worth failing over a bonus that did not.
  try {
    const { epoch } = await rpc.epochClock();
    await grantFedCharge(formatAddress(target), epoch);
  } catch (cause) {
    if (!(cause instanceof RpcUnavailableError)) throw cause;
  }

  return NextResponse.json({ fed: formatAddress(target), reef: await getReefState(address) });
}
