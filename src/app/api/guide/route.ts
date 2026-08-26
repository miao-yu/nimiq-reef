import { NextResponse } from 'next/server';
import { currentAddress } from '@/lib/server/session';
import { listSpecimens } from '@/lib/server/reef-repo';
import { SPECIES, SPECIES_ORDER } from '@/lib/reef/species';
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
  specimens.forEach((s) => counts.set(s.species, (counts.get(s.species) ?? 0) + 1));

  const entries: GuideEntry[] = SPECIES_ORDER.map((species) => ({
    species,
    tier: SPECIES[species].tier,
    unlockDay: SPECIES[species].unlockDay,
    count: counts.get(species) ?? 0,
    discovered: (counts.get(species) ?? 0) > 0,
  }));

  return NextResponse.json({
    entries,
    discovered: entries.filter((e) => e.discovered).length,
    total: entries.length,
    specimens,
  });
}
