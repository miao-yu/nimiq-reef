import { NextResponse } from 'next/server';
import { communitySnapshot } from '@/lib/server/reef-repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public on purpose — this is what someone sees before signing in. */
export async function GET() {
  return NextResponse.json(await communitySnapshot());
}
