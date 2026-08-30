import { NextResponse } from 'next/server';
import { currentAddress } from '@/lib/server/session';
import { getReefState } from '@/lib/server/reef-state';
import { setLook } from '@/lib/server/reef-repo';
import { FLOORS, WALLS, isUnlocked, type FloorKey, type WallKey } from '@/lib/reef/decor';

export const runtime = 'nodejs';

/**
 * Choose how the reef looks.
 *
 * Checked here rather than trusted from the client, because the client is the
 * one place a lock is only a suggestion. Both values are validated against
 * what this reef has actually earned, and a request naming something it has
 * not is refused rather than quietly ignored — a control that appears to work
 * and does nothing is worse than one that says no.
 */
export async function POST(request: Request) {
  const address = await currentAddress();
  if (!address) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  let body: { floor?: unknown; wall?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const state = await getReefState(address);
  const floor = String(body.floor ?? state.floor) as FloorKey;
  const wall = String(body.wall ?? state.wall) as WallKey;

  if (!FLOORS[floor] || !WALLS[wall]) {
    return NextResponse.json({ error: 'No such look.' }, { status: 400 });
  }
  if (!isUnlocked(FLOORS[floor], state.earned) || !isUnlocked(WALLS[wall], state.earned)) {
    return NextResponse.json({ error: 'Not unlocked yet.' }, { status: 403 });
  }

  await setLook(address, floor, wall);
  return NextResponse.json({ reef: await getReefState(address) });
}
