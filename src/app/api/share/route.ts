import { NextResponse } from 'next/server';
import { currentAddress } from '@/lib/server/session';
import { getGroveState } from '@/lib/server/grove-state';
import { communitySnapshot } from '@/lib/server/grove-repo';
import { renderShareImage } from '@/lib/server/share-image';
import { COMMUNITY_DAY, SEEDED_COMMUNITY, layoutCommunity } from '@/lib/grove';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A PNG of your grove, or of the community's when nobody is signed in.
 *
 * People screenshot gardens, and Marketing is a quarter of the competition
 * score — so this exists to make the thing worth posting an actual artefact
 * rather than a cropped screenshot.
 */
export async function GET() {
  const address = await currentAddress();

  if (address) {
    const grove = await getGroveState(address);
    const caption =
      grove.plants.length === 0
        ? `Day ${grove.day} — nothing planted yet`
        : grove.daysStaked > 0
          ? `Day ${grove.day} — ${grove.daysStaked} ${grove.daysStaked === 1 ? 'day' : 'days'} staked`
          : `Day ${grove.day} in my grove`;
    return png(renderShareImage({ plants: grove.plants, day: grove.day, caption }));
  }

  const snapshot = await communitySnapshot();
  const plants = layoutCommunity(snapshot.plants.length ? snapshot.plants : SEEDED_COMMUNITY);
  const caption = snapshot.totalPlants > 0
    ? `${snapshot.totalPlants} ${snapshot.totalPlants === 1 ? 'plant' : 'plants'} growing`
    : 'A garden that grows from staking';
  return png(renderShareImage({ plants, day: COMMUNITY_DAY, caption }));
}

function png(body: Buffer): NextResponse {
  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': 'image/png',
      // Short cache: the grove changes on every watering.
      'Cache-Control': 'public, max-age=300',
    },
  });
}
