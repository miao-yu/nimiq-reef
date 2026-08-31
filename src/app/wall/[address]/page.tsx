import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WallView } from '@/components/WallView';
import { publicReef } from '@/lib/server/reef-repo';
import { normalizeAddress, formatAddress, truncateAddress } from '@/lib/nimiq/address';

type Params = Promise<{ address: string }>;

/**
 * A reef with nothing on it.
 *
 * Meant to be pointed at by a live-wallpaper tool — Plash on macOS, Lively on
 * Windows — or a wall display, so it carries no header, no controls and no
 * scrims. Everything those add is furniture, and furniture behind desktop
 * icons is clutter.
 *
 * Landscape rather than the phone-shaped Stage: a desktop is wide, and the
 * tank fills whatever window it is given.
 *
 * Addressed rather than signed in. A wallpaper is set once and left running
 * for weeks; a session cookie in a background web view is the wrong thing to
 * depend on, and public reef data needs neither.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function WallPage({ params }: { params: Params }) {
  const { address } = await params;
  const parsed = normalizeAddress(address);
  if (!parsed) notFound();

  const reef = await publicReef(formatAddress(parsed));
  if (!reef) notFound();

  return <WallView reef={reef} label={truncateAddress(reef.address)} />;
}
