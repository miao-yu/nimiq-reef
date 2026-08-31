import { NextResponse } from 'next/server';
import { publicReef } from '@/lib/server/reef-repo';
import { normalizeAddress, formatAddress } from '@/lib/nimiq/address';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * What a wall re-reads every few minutes.
 *
 * The same public data the page was rendered with, so a wallpaper left running
 * for a week keeps up with what its owner has caught. No session: a wall is
 * addressed, not signed in.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const parsed = normalizeAddress(address);
  if (!parsed) return NextResponse.json({ error: 'That is not an address.' }, { status: 400 });

  const reef = await publicReef(formatAddress(parsed));
  if (!reef) return NextResponse.json({ error: 'No reef there.' }, { status: 404 });
  return NextResponse.json(reef);
}
