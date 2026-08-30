import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { currentAddress } from '@/lib/server/session';
import { getReefState } from '@/lib/server/reef-state';
import { recentSpecies, recordRoll } from '@/lib/server/reef-repo';
import { rollSpecies } from '@/lib/reef/progression';
import { SPECIES } from '@/lib/reef/species';
import type { SpeciesKey } from '@/lib/reef/types';
import { isShiny } from '@/lib/tank/traits';

export const runtime = 'nodejs';

/**
 * Spend a charge, discover a specimen.
 *
 * **Every roll produces something.** Rarity is weighted by unbroken days
 * staked and by nothing else — a wallet cannot buy better odds, which is the
 * line between this and a loot box with a price tag.
 *
 * The roll happens on the server with crypto randomness. A client-side roll
 * could be re-rolled until it produced a whale.
 */
export async function POST() {
  const address = await currentAddress();
  if (!address) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const state = await getReefState(address);
  if (state.charges < 1) {
    return NextResponse.json(
      {
        error: 'No charges left. One comes back every eight hours.',
        nextChargeInMs: state.nextChargeInMs,
      },
      { status: 409 },
    );
  }

  // What was caught lately, so the roll can lean away from it.
  const recent = new Map<SpeciesKey, number>();
  for (const key of await recentSpecies(address)) recent.set(key, (recent.get(key) ?? 0) + 1);

  const random = () => randomInt(0, 2 ** 30) / 2 ** 30;
  const { species, tier } = rollSpecies(
    { peak: state.peakStreak, current: state.daysStaked },
    random,
    undefined,
    recent,
  );

  // Goes straight on display if there is room; otherwise it waits in the guide
  // and the owner decides what to swap out. Discovery is never blocked by a
  // full tank.
  const slot = state.freePlots.length > 0 ? state.freePlots[0]! : null;
  const seed = randomInt(1, 2 ** 31);
  const id = await recordRoll(address, species, tier, seed, slot, state.epoch);

  return NextResponse.json({
    // One in 250, and until now it happened in total silence.
    discovered: { id, species, tier, label: SPECIES[species].label, slot, shiny: isShiny(seed, tier) },
    reef: await getReefState(address),
  });
}
