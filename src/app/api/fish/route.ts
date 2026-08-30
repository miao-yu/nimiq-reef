import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { currentAddress } from '@/lib/server/session';
import { getReefState } from '@/lib/server/reef-state';
import { claimForgivenMiss, recordMiss, recordRoll } from '@/lib/server/reef-repo';
import { rollSpecies } from '@/lib/reef/progression';
import { SPECIES } from '@/lib/reef/species';
import { pondFor } from '@/lib/reef/ponds';
import { formatAddress, normalizeAddress } from '@/lib/nimiq/address';

export const runtime = 'nodejs';

/**
 * One settle per address per second and a half.
 *
 * A backstop, not the fix: the real guard is on the client, which used to fire
 * `settle('missed')` on every animation frame until the response came back and
 * so spent every charge a player had on one missed bite. A cast takes seconds,
 * so nothing legitimate is ever this fast, and bounding it here means the next
 * client bug of that shape costs one charge instead of all of them.
 *
 * In memory, so it does not survive a restart and would not hold across
 * several instances. There is one instance, and this protects charges rather
 * than money.
 */
const RECENT = new Map<string, number>();
const MIN_GAP_MS = 1500;

function tooSoon(address: string): boolean {
  const now = Date.now();
  const last = RECENT.get(address) ?? 0;
  if (now - last < MIN_GAP_MS) return true;
  RECENT.set(address, now);
  // The map only ever holds signed-in addresses that fished recently, but it
  // should not grow without bound on a long-lived process.
  if (RECENT.size > 5000) {
    for (const [key, at] of RECENT) if (now - at > 60_000) RECENT.delete(key);
  }
  return false;
}

/**
 * Land a fish, or lose it.
 *
 * The minigame runs on the client and reports its outcome, which means a
 * determined player could always claim a hit. That is deliberate and not a
 * hole: claiming a hit gets exactly the roll the old Discover button gave for
 * the same charge, so the only thing cheating buys is skipping the part that
 * is fun. There is nothing here worth defending with a server-side clock.
 *
 * What is *not* left to the client: the roll itself. Rarity is decided here
 * with crypto randomness against days staked, so a client cannot re-roll until
 * it gets a whale.
 */
export async function POST(request: Request) {
  const address = await currentAddress();
  if (!address) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  let body: { pond?: unknown; outcome?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const parsed = normalizeAddress(body.pond);
  if (!parsed) return NextResponse.json({ error: 'Which pond?' }, { status: 400 });
  if (body.outcome !== 'landed' && body.outcome !== 'missed') {
    return NextResponse.json({ error: 'outcome must be landed or missed.' }, { status: 400 });
  }

  if (tooSoon(address)) {
    return NextResponse.json({ error: 'Slow down a moment.' }, { status: 429 });
  }

  const pond = formatAddress(parsed);
  const state = await getReefState(address);
  if (state.charges < 1) {
    return NextResponse.json(
      { error: 'No charges left.', nextChargeInMs: state.nextChargeInMs },
      { status: 409 },
    );
  }

  if (body.outcome === 'missed') {
    // The first miss each day is free. A charge is worth twelve hours, and
    // losing one to a mistimed tap on a phone is a harsh trade — this keeps the
    // tension while stopping a single fumble from costing a whole evening.
    //
    // Claiming is what marks it used. The first version only *recorded* misses
    // that were not forgiven, so the counter never moved and every miss was
    // free — the tension was gone and nothing said so.
    const forgiven = await claimForgivenMiss(address);
    if (!forgiven) await recordMiss(address, state.epoch, pond);
    return NextResponse.json({
      outcome: 'missed',
      forgiven,
      reef: await getReefState(address),
    });
  }

  const random = () => randomInt(0, 2 ** 30) / 2 ** 30;
  const { species, tier } = rollSpecies(
    { peak: state.peakStreak, current: state.daysStaked },
    random,
    pondFor(pond).water.favours,
  );

  // On display if there is room; otherwise it waits in the guide and the owner
  // decides what to swap. Discovery is never blocked by a full tank.
  const slot = state.freePlots.length > 0 ? state.freePlots[0]! : null;
  const id = await recordRoll(address, species, tier, randomInt(1, 2 ** 31), slot, state.epoch, 'charge', pond);

  return NextResponse.json({
    outcome: 'landed',
    caught: {
      id,
      species,
      tier,
      slot,
      label: SPECIES[species].label,
      blurb: SPECIES[species].blurb,
    },
    reef: await getReefState(address),
  });
}
