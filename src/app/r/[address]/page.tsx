import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { publicReef } from '@/lib/server/reef-repo';
import { formatAddress, normalizeAddress, truncateAddress } from '@/lib/nimiq/address';
import { PublicReefView } from '@/components/PublicReefView';

export const runtime = 'nodejs';

/**
 * Somebody's reef, for anybody.
 *
 * The address is the identity, so this needs no lookup table and no account.
 * It is also the site's only source of real pages — before this there were two
 * indexable URLs in total, which is a thin thing to hand a search engine.
 *
 * A reef whose owner opted out is a 404, indistinguishable from one that was
 * never made.
 */
async function load(raw: string) {
  const parsed = normalizeAddress(decodeURIComponent(raw));
  if (!parsed) return null;
  return publicReef(formatAddress(parsed));
}

export async function generateMetadata(
  { params }: { params: Promise<{ address: string }> },
): Promise<Metadata> {
  const { address } = await params;
  const reef = await load(address);
  if (!reef) return { title: 'No reef there', robots: { index: false, follow: false } };

  const short = truncateAddress(reef.address);
  const title = `${short}'s reef`;
  const description =
    `Day ${reef.day}. ${reef.plants.length} ${reef.plants.length === 1 ? 'species' : 'species'} ` +
    `on display, ${reef.daysStaked} ${reef.daysStaked === 1 ? 'day' : 'days'} staked.`;
  const card = `/r/${encodeURIComponent(reef.address.replace(/\s/g, ''))}/card`;

  return {
    title,
    description,
    alternates: { canonical: `/r/${reef.address.replace(/\s/g, '')}` },
    openGraph: { title, description, images: [{ url: card, width: 480, height: 300 }] },
    twitter: { card: 'summary_large_image', title, description, images: [card] },
  };
}

export default async function ReefPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const reef = await load(address);
  if (!reef) notFound();

  /*
   * The data is fetched here and handed down, so the species list and the
   * numbers are in the server-rendered HTML — this is the only page on the
   * site with content worth indexing, and a canvas indexes as nothing.
   */
  return <PublicReefView reef={reef} />;
}
