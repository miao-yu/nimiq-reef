import { NextResponse } from 'next/server';
import { communityReefs, type CommunitySort } from '@/lib/server/reef-repo';
import { registry } from '@/lib/server/registry';
import { pondFor } from '@/lib/reef/ponds';
import { formatAddress, normalizeAddress } from '@/lib/nimiq/address';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SORTS: readonly CommunitySort[] = ['staked', 'new', 'species', 'quiet'];

/**
 * A page of public reefs.
 *
 * No session: reef pages are already public and this is the index of them.
 * Anything a reef discloses here — stake, delegation, what is on display — a
 * Nimiq node would tell anybody who asked for that address, and reefs whose
 * owner opted out never appear.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const asked = url.searchParams.get('sort');
  const sort = SORTS.includes(asked as CommunitySort) ? (asked as CommunitySort) : 'staked';

  // A pool filter has to be a real address or it is not a filter.
  const poolParam = url.searchParams.get('pool');
  const parsedPool = poolParam ? normalizeAddress(poolParam) : null;
  if (poolParam && !parsedPool) {
    return NextResponse.json({ error: 'That is not a validator address.' }, { status: 400 });
  }

  const page = await communityReefs({
    sort,
    pool: parsedPool ? formatAddress(parsedPool) : null,
    cursor: url.searchParams.get('cursor'),
    limit: Number(url.searchParams.get('limit') ?? 12),
  });

  // Names and logos for whichever pools appear on this page, so a card can say
  // who somebody stakes with rather than only where.
  const known = await registry();
  const reefs = page.reefs.map((reef): Record<string, unknown> => {
    const meta = reef.delegation
      ? known.get(reef.delegation.replace(/\s+/g, '').toUpperCase())
      : undefined;
    return {
      ...reef,
      pool: reef.delegation
        ? {
            address: reef.delegation,
            name: meta?.name ?? null,
            logo: Boolean(meta?.logo),
            water: pondFor(reef.delegation).water.label,
          }
        : null,
    };
  });

  return NextResponse.json({ reefs, next: page.next, sort });
}
