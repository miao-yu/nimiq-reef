import { NextResponse } from 'next/server';
import { PrivateKey, PublicKey, Signature } from '@nimiq/core';

export const runtime = 'nodejs';

/**
 * Throwaway wallet for local development. Never reachable in production.
 *
 * The key lives in memory for the life of the process, so restarting the dev
 * server gives you a fresh address — which is useful for testing a brand new
 * grove.
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

export async function GET() {
  const blocked = guard();
  if (blocked) return blocked;
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
  const data = new TextEncoder().encode(message);
  const signature = Signature.create(priv, pub, data);

  return NextResponse.json({
    publicKey: pub.toHex(),
    signature: signature.toHex(),
  });
}
