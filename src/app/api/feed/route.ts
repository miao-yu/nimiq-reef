import { NextResponse } from 'next/server';
import { currentAddress } from '@/lib/server/session';
import { getReefState } from '@/lib/server/reef-state';
import { feedOwn } from '@/lib/server/reef-repo';

export const runtime = 'nodejs';

/**
 * Feed your own reef. Once per UTC day, free, works at zero stake.
 *
 * Idempotent: feeding twice in a day is not an error, it simply does nothing.
 * Nothing ever dies from a missed feed either — the reef just does not advance
 * that day. Losing a streak number is a consequence; losing the fish would be
 * a punishment, and this app sits on top of somebody's real money.
 */
export async function POST() {
  const address = await currentAddress();
  if (!address) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  await feedOwn(address);
  return NextResponse.json({ reef: await getReefState(address) });
}
