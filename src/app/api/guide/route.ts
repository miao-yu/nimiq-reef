import { NextResponse } from 'next/server';
import { currentAddress } from '@/lib/server/session';
import { listSpecimens } from '@/lib/server/reef-repo';
import { SPECIES, SPECIES_ORDER } from '@/lib/reef/species';
import { isShiny, traitKey, LOOKS_PER_TIER } from '@/lib/tank/traits';
import { isFlora } from '@/lib/tank/types';
import type { GuideEntry } from '@/lib/reef/state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The field guide. Everything ever discovered, permanently.
 *
 * Undiscovered species are returned too, so the client can draw them as
 * silhouettes with their unlock day. That is what lets the ladder run to a
 * year without the guide looking empty — you are not staring at a blank, you
 * are staring at an outline.
 */
export async function GET() {
  const address = await currentAddress();
  if (!address) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const specimens = await listSpecimens(address);
  const counts = new Map<string, number>();
  const shinies = new Map<string, number>();
  // Distinct looks, derived from the seed and tier already stored on every
  // specimen — so the whole variant collection needed no new storage at all.
  const looks = new Map<string, Set<string>>();

  for (const s of specimens) {
    counts.set(s.species, (counts.get(s.species) ?? 0) + 1);
    if (isShiny(s.seed, s.tier)) shinies.set(s.species, (shinies.get(s.species) ?? 0) + 1);
    // Flora have no crest, eyes or mouth — the trait system only reaches
    // fauna, so counting "looks" for kelp would be counting parts that are
    // never drawn. They vary by seed, but not along axes anybody can name.
    if (isFlora(s.species)) continue;
    const set = looks.get(s.species) ?? new Set<string>();
    set.add(traitKey(s.seed, s.tier));
    looks.set(s.species, set);
  }

  const entries: GuideEntry[] = SPECIES_ORDER.map((species) => ({
    species,
    tier: SPECIES[species].tier,
    unlockDay: SPECIES[species].unlockDay,
    count: counts.get(species) ?? 0,
    discovered: (counts.get(species) ?? 0) > 0,
    shiny: shinies.get(species) ?? 0,
    looks: looks.get(species)?.size ?? 0,
    looksPossible: isFlora(species) ? 0 : LOOKS_PER_TIER[SPECIES[species].tier],
  }));

  return NextResponse.json({
    entries,
    discovered: entries.filter((e) => e.discovered).length,
    total: entries.length,
    shiny: entries.reduce((n, e) => n + e.shiny, 0),
    specimens,
  });
}
