import { NextResponse } from 'next/server';
import { renderLookCard } from '@/lib/server/share-image';
import { parseLook } from '@/lib/reef/look';
import { currentAddress } from '@/lib/server/session';
import { ownsLook } from '@/lib/server/reef-repo';

export const runtime = 'nodejs';

/**
 * The share preview for one look.
 *
 * Gated like the page it belongs to. The creature is the whole of the detail,
 * so an open image URL would make the gate theatre — and the gate is what was
 * asked for.
 *
 * The cost is real and worth naming: an Open Graph crawler has no session, so
 * a shared link can no longer render a preview. Gating and sharing pull in
 * opposite directions here, and this resolves it in favour of the gate.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ species: string; tier: string; seed: string }> },
) {
  const { species, tier, seed } = await params;
  const look = parseLook(species, tier, seed);
  if (!look) return NextResponse.json({ error: 'No such look.' }, { status: 404 });

  const address = await currentAddress();
  if (!address || !(await ownsLook(address, look.species, look.tier, look.seed))) {
    return NextResponse.json({ error: 'Not in your collection.' }, { status: 404 });
  }

  const png = renderLookCard(look.species, look.tier, look.seed);
  return new NextResponse(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
}
