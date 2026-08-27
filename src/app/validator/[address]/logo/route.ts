import { NextResponse } from 'next/server';
import { logoFor } from '@/lib/server/registry';
import { formatAddress, normalizeAddress } from '@/lib/nimiq/address';

export const runtime = 'nodejs';

/**
 * A validator's logo, one at a time.
 *
 * Served here rather than inlined into the pond list because the registry's
 * logos total about 1.4MB — sending all of them to draw a list would cost more
 * than the rest of the app put together. Individually they are cached by the
 * browser and only the rows on screen ever load.
 *
 * Outside /api on purpose: everything under /api is forced to no-store, and a
 * logo is public, immutable in practice, and shared by every visitor.
 */
export async function GET(_: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  const parsed = normalizeAddress(decodeURIComponent(address));
  if (!parsed) return new NextResponse(null, { status: 400 });

  const logo = await logoFor(formatAddress(parsed));
  if (!logo) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(logo.bytes), {
    headers: { 'Content-Type': logo.mime },
  });
}
