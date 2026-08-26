import { NextResponse } from 'next/server';
import { currentAddress } from '@/lib/server/session';
import { setHidden } from '@/lib/server/reef-repo';
import { getReefState } from '@/lib/server/reef-state';

export const runtime = 'nodejs';

/**
 * Opt out of, or back into, a public reef page.
 *
 * The chain already shows the stake behind a reef, but not who fed whom or
 * when somebody opens the app — which a page at /r/<address> makes inferrable.
 * That is what this switch is for.
 */
export async function POST(request: Request) {
  const address = await currentAddress();
  if (!address) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  let body: { hidden?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }
  if (typeof body.hidden !== 'boolean') {
    return NextResponse.json({ error: 'hidden must be true or false.' }, { status: 400 });
  }

  await setHidden(address, body.hidden);
  return NextResponse.json({ reef: await getReefState(address) });
}
