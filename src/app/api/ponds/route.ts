import { NextResponse } from 'next/server';
import { rpc, RpcUnavailableError } from '@/lib/server/rpc';
import { currentAddress } from '@/lib/server/session';
import { getReefState } from '@/lib/server/reef-state';
import { pondFor } from '@/lib/reef/ponds';
import { registry } from '@/lib/server/registry';
import { hotCastSpent, pinHotPond } from '@/lib/server/reef-repo';

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

    const eligible = validators
      .filter((v) => {
        const meta = known.get(v.address.replace(/\s+/g, '').toUpperCase());
        return meta?.isPool || state.delegation === v.address;
      })
      .map((v) => v.address);

    // Chosen from the pools alone, so the hot pond is the same for everybody.
    // A player's own solo validator is in their list but never in this draw.
    const poolsOnly = validators
      .filter((v) => known.get(v.address.replace(/\s+/g, '').toUpperCase())?.isPool)
      .map((v) => v.address);
    const hot = await pinHotPond(state.epoch, poolsOnly.length > 0 ? poolsOnly : eligible);
    const hotSpent = hot ? await hotCastSpent(address, state.epoch) : true;

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
          hot: v.address === hot,
        };
      })
      // Hot first, then yours, then stable by address: the free cast is the
      // most useful thing on the screen and should not need scrolling for.
      .sort((a, b) => {
        if (a.hot !== b.hot) return a.hot ? -1 : 1;
        if (a.yours !== b.yours) return a.yours ? -1 : 1;
        return a.address.localeCompare(b.address);
      });

    return NextResponse.json({ ponds, charges: state.charges, hot, hotSpent, epoch: state.epoch });
  } catch (cause) {
    if (cause instanceof RpcUnavailableError) {
      return NextResponse.json({ error: 'The Nimiq node is unreachable.' }, { status: 503 });
    }
    throw cause;
  }
}
