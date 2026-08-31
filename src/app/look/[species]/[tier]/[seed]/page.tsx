import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { LookDetail } from '@/components/LookDetail';
import { SPECIES } from '@/lib/reef/species';
import { currentAddress } from '@/lib/server/session';
import { ownsLook } from '@/lib/server/reef-repo';
import { parseLook, oddsFor, partsOf, describeLook, isShinyLook, ODDS_AT_DAY } from '@/lib/reef/look';
import styles from '@/components/LookDetail.module.css';

type Params = Promise<{ species: string; tier: string; seed: string }>;

/**
 * One look, for the person who has one.
 *
 * Gated on ownership: a look you have never caught shows nothing but the fact
 * that you have not caught it. That makes the page per-viewer, which is why
 * next.config gives /look the same private, no-store treatment as the root —
 * a shared cache handing one player's "owned" view to somebody who owns
 * nothing would be the same incident as the one that once served a signed-in
 * user's tank to everyone.
 *
 * Still noindex. Tens of thousands of near-identical pages is the shape search
 * engines treat as doorway content, and now they are not public anyway.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { species, tier, seed } = await params;
  const look = parseLook(species, tier, seed);
  if (!look) return { title: 'No such look', robots: { index: false, follow: false } };

  const address = await currentAddress();
  const owned = address ? await ownsLook(address, look.species, look.tier, look.seed) : false;
  // Nothing about the creature in the title unless the viewer has one.
  if (!owned) return { title: 'A look you have not found', robots: { index: false, follow: false } };

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

  const address = await currentAddress();
  const owned = address ? await ownsLook(address, look.species, look.tier, look.seed) : false;

  if (!owned) {
    return (
      <main className={styles.wrap}>
        <Link className={styles.back} href="/collection">
          ← Collection
        </Link>
        <div className={styles.locked}>
          <h1 className={styles.lockedTitle}>
            {address ? 'You have not found this one' : 'Sign in to see your collection'}
          </h1>
          <p className={styles.lockedNote}>
            {address
              ? 'A look opens once you have caught a creature wearing it. Keep casting.'
              : 'Looks belong to the reef that caught them.'}
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href={address ? '/fish' : '/'}>
              {address ? 'Go fishing' : 'Claim a reef'}
            </Link>
            <Link className={styles.secondary} href="/collection">
              Your collection
            </Link>
          </div>
        </div>
      </main>
    );
  }

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
