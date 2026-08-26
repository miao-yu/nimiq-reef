import { NextResponse } from 'next/server';
import { publicReef } from '@/lib/server/reef-repo';
import { renderReefCard } from '@/lib/server/share-image';
import { adaptPlants } from '@/lib/tank/adapt';
import { depthForStake } from '@/lib/reef/vessel';
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
 * Cacheable, unlike /api/share — that one is keyed on the session cookie and
 * caching it once leaked one player's reef to everybody. This is keyed on the
 * address in the path and carries no session at all.
 */
export async function GET(_: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  const parsed = normalizeAddress(decodeURIComponent(address));
  if (!parsed) return NextResponse.json({ error: 'Not a Nimiq address.' }, { status: 400 });

  const reef = await publicReef(formatAddress(parsed));
  if (!reef) return NextResponse.json({ error: 'No reef there.' }, { status: 404 });

  const png = renderReefCard(
    adaptPlants(reef.plants),
    depthForStake(reef.stakedLuna),
    reef.receivedToday,
  );

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      // Public, but short: a reef changes when its owner rolls or is fed.
      'Cache-Control': 'public, max-age=60, s-maxage=300',
    },
  });
}
