import { NextResponse } from 'next/server';
import { currentAddress } from '@/lib/server/session';
import { getReefState } from '@/lib/server/reef-state';
import { communitySnapshot } from '@/lib/server/reef-repo';
import { renderShareImage } from '@/lib/server/share-image';
import { SEEDED_COMMUNITY, layoutCommunity } from '@/lib/reef';
import { adaptPlants } from '@/lib/tank/adapt';
import { depthForStake } from '@/lib/reef/vessel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A PNG of your reef, or of the community's when nobody is signed in.
 *
 * People screenshot gardens, and Marketing is a quarter of the competition
 * score — so this exists to make the thing worth posting an actual artefact
 * rather than a cropped screenshot.
 */
export async function GET() {
  const address = await currentAddress();

  if (address) {
    const reef = await getReefState(address);
    const caption =
      reef.plants.length === 0
        ? `Day ${reef.day} — nothing planted yet`
        : reef.daysStaked > 0
          ? `Day ${reef.day} — ${reef.daysStaked} ${reef.daysStaked === 1 ? 'day' : 'days'} staked`
          : `Day ${reef.day} in my reef`;
    return png(
      renderShareImage({
        inhabitants: adaptPlants(reef.plants),
        waterLevel: depthForStake(reef.stakedLuna),
        feedings: reef.receivedToday,
        caption,
      }),
    );
  }

  const snapshot = await communitySnapshot();
  const plants = layoutCommunity(snapshot.plants.length ? snapshot.plants : SEEDED_COMMUNITY);
  const caption =
    snapshot.totalPlants > 0
      ? `${snapshot.totalPlants} living in the reef`
      : 'A tank that fills as you stake';
  return png(
    renderShareImage({ inhabitants: adaptPlants(plants), waterLevel: 0.88, caption }),
  );
}

function png(body: Buffer): NextResponse {
  return new NextResponse(new Uint8Array(body), {
    headers: { 'Content-Type': 'image/png' },
  });
  // Cache-Control comes from next.config.ts, which marks every /api response
  // no-store. This image is per-user when signed in, so `public, max-age=300`
  // — what used to be here — let a CDN hand one person's tank to another.
}
