'use client';

import Link from 'next/link';
import styles from './SideRail.module.css';

/**
 * The way to other screens.
 *
 * There was none once you signed in: the community link lived on the
 * signed-out screen only, so the moment somebody claimed a reef the rest of
 * the app became unreachable.
 *
 * It draws a line the app did not have before. The dock is what you *do*, the
 * drawer is what you can *read* about this reef, and the rail is where else
 * you can *go*. Anything that is a place belongs here; anything that is a fact
 * about this reef belongs in the drawer.
 *
 * Labelled, not icon-only. An unlabelled glyph on the edge of the screen is
 * the same mistake as the drawer handle that read as a caption, and there is
 * no hover on a phone to rescue it.
 */
export function SideRail({ items }: { items: { href: string; label: string; icon: React.ReactNode }[] }) {
  return (
    <nav className={styles.rail} aria-label="Elsewhere in Reef">
      {items.map((item) => (
        <Link key={item.href} className={styles.item} href={item.href}>
          <span className={styles.glyph} aria-hidden="true">
            {item.icon}
          </span>
          <span className={styles.label}>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

/** A jar of specimens: the collection, not the tank. */
export const COLLECTION_ICON = (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <path d="M6.4 2.2h7.2M7.6 2.2v3.1L4.3 12a3.4 3.4 0 0 0 3 5.1h5.4a3.4 3.4 0 0 0 3-5.1l-3.3-6.7V2.2"
          fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="8.6" cy="12.7" r="1.15" fill="currentColor" />
    <circle cx="11.7" cy="14.4" r="0.85" fill="currentColor" opacity="0.75" />
  </svg>
);

/** Many reefs at once: the shape reads as "browse" at twenty pixels. */
export const REEFS_ICON = (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <rect x="1.6" y="1.6" width="7" height="7" rx="2" fill="currentColor" opacity="0.95" />
    <rect x="11.4" y="1.6" width="7" height="7" rx="2" fill="currentColor" opacity="0.6" />
    <rect x="1.6" y="11.4" width="7" height="7" rx="2" fill="currentColor" opacity="0.6" />
    <rect x="11.4" y="11.4" width="7" height="7" rx="2" fill="currentColor" opacity="0.95" />
  </svg>
);
