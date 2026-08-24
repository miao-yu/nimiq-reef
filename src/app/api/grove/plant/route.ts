import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { currentAddress } from '@/lib/server/session';
import { getGroveState } from '@/lib/server/grove-state';
import { plant } from '@/lib/server/grove-repo';
import { SPECIES_ORDER } from '@/lib/grove';
import type { SpeciesKey } from '@/lib/grove';

export const runtime = 'nodejs';

/**
 * Fill a plot, permanently.
 *
 * Every rule is checked server-side against freshly derived state. The client
 * is told what it may plant so the UI can be honest, but it is never trusted
 * about it — otherwise a crafted request plants an elder tree on day one.
 */
export async function POST(request: Request) {
  const address = await currentAddress();
  if (!address) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  let body: { species?: unknown; plot?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const species = body.species;
  const plot = body.plot;
  if (typeof species !== 'string' || !SPECIES_ORDER.includes(species as SpeciesKey)) {
    return NextResponse.json({ error: 'Unknown species.' }, { status: 400 });
  }
  if (typeof plot !== 'number' || !Number.isInteger(plot) || plot < 0) {
    return NextResponse.json({ error: 'Plot must be a whole number.' }, { status: 400 });
  }

  const state = await getGroveState(address);

  if (!state.speciesUnlocked.includes(species as SpeciesKey)) {
    return NextResponse.json(
      { error: 'That species is not unlocked yet. Keep your stake going.' },
      { status: 403 },
    );
  }
  if (plot >= state.plotsUnlocked) {
    return NextResponse.json({ error: 'That plot is not cleared yet.' }, { status: 403 });
  }
  if (!state.freePlots.includes(plot)) {
    return NextResponse.json(
      { error: 'Something is already growing there, and it stays.' },
      { status: 409 },
    );
  }

  const outcome = await plant(address, plot, species as SpeciesKey, state.day, randomInt(1, 2 ** 31));
  if (outcome === 'plot-taken') {
    // Lost a race with another tap; the unique key caught it.
    return NextResponse.json(
      { error: 'Something is already growing there, and it stays.' },
      { status: 409 },
    );
  }

  return NextResponse.json(await getGroveState(address));
}
