import { NextResponse } from 'next/server';
import { currentAddress } from '@/lib/server/session';
import { getReefState } from '@/lib/server/reef-state';
import { displaySpecimen, releaseSpecimen } from '@/lib/server/reef-repo';

export const runtime = 'nodejs';

/**
 * Move a specimen in or out of the tank.
 *
 * `release` never deletes anything — it clears the display slot and the row
 * survives, so the field guide keeps a permanent record. You lose the exhibit,
 * never the discovery.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const address = await currentAddress();
  if (!address) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Unknown specimen.' }, { status: 400 });
  }

  let body: { action?: unknown; slot?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  if (body.action === 'release') {
    const outcome = await releaseSpecimen(address, id);
    if (outcome === 'not-found') {
      return NextResponse.json({ error: 'Unknown specimen.' }, { status: 404 });
    }
    return NextResponse.json({ reef: await getReefState(address) });
  }

  if (body.action !== 'display') {
    return NextResponse.json({ error: 'Action must be display or release.' }, { status: 400 });
  }

  const state = await getReefState(address);
  const slot = typeof body.slot === 'number' ? body.slot : state.freePlots[0];
  if (slot === undefined) {
    return NextResponse.json(
      { error: 'The tank is full. Return something to the reef first.' },
      { status: 409 },
    );
  }
  if (slot < 0 || slot >= state.plotsUnlocked) {
    return NextResponse.json({ error: 'That slot does not exist.' }, { status: 403 });
  }

  const outcome = await displaySpecimen(address, id, slot);
  if (outcome === 'slot-taken') {
    return NextResponse.json({ error: 'Something is already in that slot.' }, { status: 409 });
  }
  if (outcome === 'not-found') {
    return NextResponse.json({ error: 'Unknown specimen.' }, { status: 404 });
  }
  return NextResponse.json({ reef: await getReefState(address) });
}
