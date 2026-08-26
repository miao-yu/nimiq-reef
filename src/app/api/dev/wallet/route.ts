import { NextResponse } from 'next/server';
import { PrivateKey, PublicKey, Signature } from '@nimiq/core';
import { signedMessageDigest } from '@/lib/server/signed-message';

export const runtime = 'nodejs';

/**
 * Throwaway wallet for local development. Never reachable in production.
 *
 * The key lives in memory for the life of the process, so restarting the dev
 * server gives you a fresh address — which is useful for testing a brand new
 * reef.
 */
let keys: { priv: PrivateKey; pub: PublicKey } | undefined;

function wallet() {
  if (!keys) {
    const priv = PrivateKey.generate();
    keys = { priv, pub: PublicKey.derive(priv) };
  }
  return keys;
}

function guard(): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return null;
}

export async function GET(request: Request) {
  const blocked = guard();
  if (blocked) return blocked;
  // `?fresh=1` rotates the key. Without it the smoke test inherits the charges
  // and specimens of whatever ran before it in the same process, and a rerun
  // fails for reasons that have nothing to do with the code under test.
  if (new URL(request.url).searchParams.get('fresh') === '1') keys = undefined;
  const { pub } = wallet();
  return NextResponse.json({ address: pub.toAddress().toUserFriendlyAddress() });
}

export async function POST(request: Request) {
  const blocked = guard();
  if (blocked) return blocked;

  const { message } = (await request.json()) as { message?: unknown };
  if (typeof message !== 'string') {
    return NextResponse.json({ error: 'message must be a string' }, { status: 400 });
  }

  const { priv, pub } = wallet();
  // Frame exactly as Nimiq Pay and the Hub do, or the dev path stops
  // exercising the same verification as production.
  const data = signedMessageDigest(message);
  const signature = Signature.create(priv, pub, data);

  return NextResponse.json({
    publicKey: pub.toHex(),
    signature: signature.toHex(),
  });
}
