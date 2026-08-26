import { NextResponse } from 'next/server';
import { currentAddress } from '@/lib/server/session';
import { setHidden } from '@/lib/server/reef-repo';
import { getReefState } from '@/lib/server/reef-state';

export const runtime = 'nodejs';

/**
 * Opt out of, or back into, a public reef page.
 *
 * **Nothing in the UI calls this right now, and that is deliberate** — the
 * menu entries for hiding a reef and viewing your own page were removed on
 * 26 Aug to keep the dropdown to three items while reefs are few. The switch
 * itself stays: `hidden` still filters `publicReef`, so restoring the entry is
 * one button, not a feature. Do not delete this as dead code.
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
