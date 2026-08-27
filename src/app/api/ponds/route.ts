import { NextResponse } from 'next/server';
import { rpc, RpcUnavailableError } from '@/lib/server/rpc';
import { currentAddress } from '@/lib/server/session';
import { getReefState } from '@/lib/server/reef-state';
import { pondFor } from '@/lib/reef/ponds';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The ponds: every elected validator, with the water its address gives it.
 *
 * The list rotates on the chain's clock — the elected set changes at each
 * election block — but a pond's character is keyed to its address, so a
 * validator that drops out and comes back is the same water it was.
 */
export async function GET() {
  const address = await currentAddress();
  if (!address) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  try {
    const [validators, state] = await Promise.all([
      rpc.getActiveValidators(),
      getReefState(address),
    ]);

    const ponds = validators
      .map((v) => {
        const { water } = pondFor(v.address);
        return {
          address: v.address,
          water: water.key,
          label: water.label,
          blurb: water.blurb,
          stakers: Number(v.numStakers),
          // The one place the app can reward *which* validator you chose.
          yours: state.delegation === v.address,
        };
      })
      .sort((a, b) => (a.yours === b.yours ? a.address.localeCompare(b.address) : a.yours ? -1 : 1));

    return NextResponse.json({ ponds, charges: state.charges });
  } catch (cause) {
    if (cause instanceof RpcUnavailableError) {
      return NextResponse.json({ error: 'The Nimiq node is unreachable.' }, { status: 503 });
    }
    throw cause;
  }
}
