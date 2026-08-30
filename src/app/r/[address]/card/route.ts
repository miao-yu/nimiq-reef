import { NextResponse } from 'next/server';
import { publicReef } from '@/lib/server/reef-repo';
import { renderReefCard } from '@/lib/server/share-image';
import { adaptPlants } from '@/lib/tank/adapt';
import { depthForStake } from '@/lib/reef/vessel';
import { foodInWater } from '@/lib/reef/feeding';
import { formatAddress, normalizeAddress } from '@/lib/nimiq/address';

export const runtime = 'nodejs';

/**
 * A reef, as a picture, for anybody.
 *
 * Public on purpose and safe to be: stake, delegation and staking history are
 * already readable from any Nimiq node for any address, so this discloses
 * nothing new. A reef whose owner opted out 404s exactly like one that does
 * not exist.
 *
 * It lives under /r rather than /api on purpose. Every /api response is forced
 * to `no-store, private` by next.config, and that blanket rule stays blanket —
 * it is there because an uncached /api/grove once served one player's reef to
 * anonymous callers. This route is keyed on the address in the path, reads no
 * session, and so belongs with the pages instead, where a short shared cache
 * is correct.
 */
export async function GET(_: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  const parsed = normalizeAddress(decodeURIComponent(address));
  if (!parsed) return NextResponse.json({ error: 'Not a Nimiq address.' }, { status: 400 });

  const reef = await publicReef(formatAddress(parsed));
  if (!reef) return NextResponse.json({ error: 'No reef there.' }, { status: 404 });

  const png = renderReefCard({
    inhabitants: adaptPlants(reef.plants),
    waterLevel: depthForStake(reef.stakedLuna),
    feedings: foodInWater(reef),
    floor: reef.floor,
    wall: reef.wall,
  });

  // Cache-Control is not set here: next.config's page rule applies to
  // everything outside /api and would override it anyway. Verified against the
  // live response rather than assumed — the earlier version of this file
  // claimed a policy the server never sent.
  return new NextResponse(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
}
