import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { publicReef } from '@/lib/server/reef-repo';
import { SPECIES } from '@/lib/reef/species';
import { formatNim } from '@/lib/nimiq/policy';
import { formatAddress, normalizeAddress, truncateAddress } from '@/lib/nimiq/address';
import styles from './page.module.css';

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
  const card = `/api/reef/${encodeURIComponent(reef.address.replace(/\s/g, ''))}/card`;

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

  const compact = reef.address.replace(/\s/g, '');
  const counts = new Map<string, number>();
  for (const plant of reef.plants) counts.set(plant.species, (counts.get(plant.species) ?? 0) + 1);

  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <Link className={styles.brand} href="/">Reef</Link>
        <span className={styles.day}>Day {reef.day}</span>
      </header>

      {/* The card is a PNG from the same renderer the owner sees, so this page
          needs no canvas and no JavaScript at all. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.tank}
        src={`/api/reef/${encodeURIComponent(compact)}/card`}
        alt={`A reef with ${reef.plants.length} species on display`}
        width={480}
        height={300}
      />

      <p className={styles.address}>{truncateAddress(reef.address)}</p>

      <dl className={styles.stats}>
        <div><dt>Days staked</dt><dd>{reef.daysStaked}</dd></div>
        <div><dt>Staked</dt><dd>{formatNim(reef.stakedLuna)} NIM</dd></div>
        <div><dt>Fed</dt><dd>{reef.receivedLifetime}</dd></div>
      </dl>

      {counts.size > 0 ? (
        <ul className={styles.species}>
          {[...counts].map(([key, n]) => (
            <li key={key}>
              {SPECIES[key as keyof typeof SPECIES]?.label ?? key}
              {n > 1 ? <span className={styles.times}> ×{n}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>Nothing on display yet.</p>
      )}

      <Link className={styles.cta} href={`/?feed=${encodeURIComponent(compact)}`}>
        Feed this reef
      </Link>
      <p className={styles.note}>
        A reef fills from real Nimiq staking. Sign in to start your own.
      </p>
    </main>
  );
}
