import { NextResponse } from 'next/server';
import { currentAddress } from '@/lib/server/session';
import { buildStakeTransaction } from '@/lib/server/staking';
import { RpcUnavailableError } from '@/lib/server/rpc';
import { normalizeAddress, formatAddress } from '@/lib/nimiq/address';
import { MINIMUM_STAKE_LUNA } from '@/lib/nimiq/policy';

export const runtime = 'nodejs';

/**
 * Build an unsigned staking transaction for the signed-in address.
 *
 * The browser cannot build one without shipping WebAssembly it would rather
 * not; the server already runs `@nimiq/core`. What comes back is bytes for the
 * Hub to sign — this endpoint moves no money and needs no key.
 */
export async function POST(request: Request) {
  const address = await currentAddress();
  if (!address) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  let body: { value?: unknown; delegation?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const value = Number(body.value);
  if (!Number.isInteger(value) || value < MINIMUM_STAKE_LUNA) {
    return NextResponse.json(
      { error: `The protocol requires at least ${MINIMUM_STAKE_LUNA / 1e5} NIM.` },
      { status: 400 },
    );
  }

  // Only validated when present. Adding to an existing position keeps whatever
  // validator is already there, so the field is genuinely optional.
  let delegation: string | null = null;
  if (body.delegation !== undefined && body.delegation !== null && body.delegation !== '') {
    const parsed = normalizeAddress(body.delegation);
    if (!parsed) return NextResponse.json({ error: 'That is not a validator address.' }, { status: 400 });
    delegation = formatAddress(parsed);
  }

  try {
    return NextResponse.json(await buildStakeTransaction(address, value, delegation));
  } catch (cause) {
    if (cause instanceof RpcUnavailableError) {
      return NextResponse.json({ error: 'The Nimiq node is unreachable.' }, { status: 503 });
    }
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : 'Could not build that transaction.' },
      { status: 400 },
    );
  }
}
