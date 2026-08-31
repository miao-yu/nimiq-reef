import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LookDetail } from '@/components/LookDetail';
import { SPECIES } from '@/lib/reef/species';
import { parseLook, oddsFor, partsOf, describeLook, isShinyLook, ODDS_AT_DAY } from '@/lib/reef/look';

type Params = Promise<{ species: string; tier: string; seed: string }>;

/**
 * One look, at a URL, open to anyone holding the link.
 *
 * Everything on it derives from the three values in the path, so the page
 * redraws the creature with no database read and no session — which is what
 * lets somebody who has never played open one. Ownership gating was tried and
 * removed: it and sharing pull in opposite directions, and sharing won.
 *
 * Still noindex. The trait system can draw tens of thousands of these and they
 * differ by a crest and an eye — publishing them all is the shape search
 * engines treat as doorway content and penalise across a whole domain.
 * Crawlable rather than robots-disallowed, though: a page blocked from
 * crawling never has its noindex read.
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
