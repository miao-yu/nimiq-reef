import { NextResponse } from 'next/server';
import { currentAddress } from '@/lib/server/session';
import { getGroveState } from '@/lib/server/grove-state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const address = await currentAddress();
  if (!address) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  return NextResponse.json(await getGroveState(address));
}
