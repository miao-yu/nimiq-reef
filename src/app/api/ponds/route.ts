import { NextResponse } from 'next/server';
import { rpc, RpcUnavailableError } from '@/lib/server/rpc';
import { currentAddress } from '@/lib/server/session';
import { getReefState } from '@/lib/server/reef-state';
import { pondFor } from '@/lib/reef/ponds';
import { registry } from '@/lib/server/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The ponds: the staking pools elected for this epoch, with the water each
 * address gives it.
 *
 * Pools, not every elected validator. Half the elected set is solo nodes with
 * a handful of stakers and no registry entry — nothing a player could
 * meaningfully choose between, and nothing with a name or a face to show. What
 * is left is fifteen recognisable pools, every one of them with a real logo.
 *
 * Your own validator is always in the list even if it is not a pool. Dropping
 * it would take the "yours" badge and its bonus away from anybody who
 * delegates to a solo node, which is a stranger outcome than a short list.
 *
 * The list rotates on the chain's clock — the elected set changes at each
 * election block — but a pond's character is keyed to its address, so a
 * validator that drops out and comes back is the same water it was.
 */
export async function GET() {
  const address = await currentAddress();
  if (!address) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  try {
    const [validators, state, known] = await Promise.all([
      rpc.electedValidators(),
      getReefState(address),
      // Never blocks the list: registry() resolves to an empty map on failure,
      // and every row falls back to its identicon and hashed pond name.
      registry(),
    ]);

    const ponds = validators
      .filter((v) => {
        const meta = known.get(v.address.replace(/\s+/g, '').toUpperCase());
        return meta?.isPool || state.delegation === v.address;
      })
      .map((v) => {
        const { water, name } = pondFor(v.address);
        const meta = known.get(v.address.replace(/\s+/g, '').toUpperCase());
        return {
          address: v.address,
          name,
          // The operator's real name where they registered one; roughly half
          // the elected set has not, and those keep the hashed pond name.
          validator: meta?.name ?? null,
          logo: Boolean(meta?.logo),
          website: meta?.website ?? null,
          water: water.key,
          label: water.label,
          blurb: water.blurb,
          stakers: Number(v.numStakers),
          slots: Number(v.numSlots),
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
