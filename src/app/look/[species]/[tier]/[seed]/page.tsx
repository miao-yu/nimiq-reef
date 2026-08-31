import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LookDetail } from '@/components/LookDetail';
import { SPECIES } from '@/lib/reef/species';
import { parseLook, oddsFor, partsOf, describeLook, isShinyLook, ODDS_AT_DAY } from '@/lib/reef/look';

type Params = Promise<{ species: string; tier: string; seed: string }>;

/**
 * One look, at a URL.
 *
 * **Deliberately noindex.** The trait system can draw tens of thousands of
 * these, and they differ by a crest and an eye — publishing them all would be
 * a wall of near-identical thin pages, which is the shape search engines treat
 * as doorway content and penalise across the whole domain. Reef has three
 * pages worth indexing and this is not one of them.
 *
 * Crawlable though, not disallowed in robots.txt: a page blocked from crawling
 * can never be read, so its noindex is never seen. `follow` is kept so the
 * links out of here still count.
 *
 * The Open Graph tags are the point instead. This page exists to be *sent* —
 * to one person, in a chat — and that is a preview, not an index entry.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { species, tier, seed } = await params;
  const look = parseLook(species, tier, seed);
  if (!look) return { title: 'No such look', robots: { index: false, follow: false } };

  const name = SPECIES[look.species].label;
  const odds = oddsFor(look);
  const shiny = isShinyLook(look);
  const title = `${shiny ? 'Shiny ' : ''}${name} · 1 in ${odds.oneIn.toLocaleString()}`;
  const description = `${describeLook(look)} One of ${odds.looksInTier.toLocaleString()} looks a ${look.tier} can take.`;
  const card = `/look/${look.species}/${look.tier}/${look.seed}/card`;

  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: { title, description, images: [{ url: card, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: [card] },
  };
}

export default async function LookPage({ params }: { params: Params }) {
  const { species, tier, seed } = await params;
  const look = parseLook(species, tier, seed);
  if (!look) notFound();

  return (
    <LookDetail
      look={look}
      name={SPECIES[look.species].label}
      blurb={SPECIES[look.species].blurb}
      unlockDay={SPECIES[look.species].unlockDay}
      shiny={isShinyLook(look)}
      description={describeLook(look)}
      parts={partsOf(look)}
      odds={oddsFor(look)}
      oddsAtDay={ODDS_AT_DAY}
    />
  );
}
