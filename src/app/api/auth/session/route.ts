import { NextResponse } from 'next/server';
import { currentAddress, destroySession } from '@/lib/server/session';
import { fedOtherToday } from '@/lib/server/reef-repo';

export const runtime = 'nodejs';

/**
 * Who the viewer is, and the one thing they can do from a page that is not
 * their own.
 *
 * The feed budget rides along because the two screens that need it — a reef
 * page and the community list — already ask this question on load, and a
 * second round trip to learn whether one button should be grey is a round
 * trip nobody should pay for.
 */
export async function GET() {
  const address = await currentAddress();
  return NextResponse.json({
    address,
    canFeedOther: address ? !(await fedOtherToday(address)) : false,
  });
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ address: null, canFeedOther: false });
}
