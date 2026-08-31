import { NextResponse } from 'next/server';
import { renderLookCard } from '@/lib/server/share-image';
import { parseLook } from '@/lib/reef/look';

export const runtime = 'nodejs';

/**
 * The share preview for one look.
 *
 * Outside /api on purpose: the blanket no-store rule there is right for
 * per-user data and wrong for this, which is a pure function of three values
 * in the URL and identical for everybody who asks.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ species: string; tier: string; seed: string }> },
) {
  const { species, tier, seed } = await params;
  const look = parseLook(species, tier, seed);
  if (!look) return NextResponse.json({ error: 'No such look.' }, { status: 404 });

  const png = renderLookCard(look.species, look.tier, look.seed);
  return new NextResponse(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
}
