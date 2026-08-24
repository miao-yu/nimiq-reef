import { NextResponse } from 'next/server';
import { currentAddress, destroySession } from '@/lib/server/session';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ address: await currentAddress() });
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ address: null });
}
