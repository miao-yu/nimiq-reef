import { NextResponse } from 'next/server';
import { verifyWalletSignature } from '@/lib/server/auth';
import { consumeChallenge } from '@/lib/server/challenge';
import { createSession } from '@/lib/server/session';
import { isValidAddress, normalizeAddress } from '@/lib/address';

export const runtime = 'nodejs';

interface VerifyBody {
  code?: unknown;
  address?: unknown;
  publicKey?: unknown;
  signature?: unknown;
}

export async function POST(request: Request) {
  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const { code, address, publicKey, signature } = body;
  if (
    typeof code !== 'string' ||
    typeof address !== 'string' ||
    typeof publicKey !== 'string' ||
    typeof signature !== 'string' ||
    !isValidAddress(address)
  ) {
    return NextResponse.json({ error: 'Missing or malformed sign-in fields.' }, { status: 400 });
  }

  const claimed = normalizeAddress(address);
  const challenge = consumeChallenge(code, claimed);
  if (!challenge) {
    return NextResponse.json(
      { error: 'That sign-in code has expired or was already used. Try again.' },
      { status: 400 },
    );
  }

  const result = verifyWalletSignature({
    message: challenge.message,
    publicKeyHex: publicKey,
    signatureHex: signature,
    claimedAddress: claimed,
  });

  if (!result.ok) {
    return NextResponse.json({ error: 'Signature did not verify.' }, { status: 401 });
  }

  // Pin the encoding once a real device confirms it — see signed-message.ts.
  console.info(`[grove] sign-in ok address=${result.address} encoding=${result.encoding}`);

  await createSession(result.address);
  return NextResponse.json({ address: result.address });
}
