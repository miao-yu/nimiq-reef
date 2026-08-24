import { NextResponse } from 'next/server';
import { issueChallenge } from '@/lib/server/challenge';
import { isValidAddress, normalizeAddress } from '@/lib/address';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const address = (body as { address?: unknown }).address;
  if (typeof address !== 'string' || !isValidAddress(address)) {
    return NextResponse.json({ error: 'Provide a valid Nimiq address.' }, { status: 400 });
  }

  const challenge = issueChallenge(normalizeAddress(address));
  return NextResponse.json(challenge);
}
