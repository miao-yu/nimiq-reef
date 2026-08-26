import type { Metadata, Viewport } from 'next';
import './globals.css';

const ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'https://reef.nimiq.cafe';

/**
 * Search results show the title and description, so they have to say what this
 * is to somebody who has never heard of it. "Reef" alone is unfindable — the
 * short name is right for a browser tab and useless in a result list.
 */
const TITLE = 'Reef — a living aquarium for Nimiq stakers';
const DESCRIPTION =
  'Stake NIM and watch a reef fill with life. A Nimiq Pay Mini App where your staking ' +
  'history becomes an aquarium you discover, feed and collect.';

/**
 * The card is what actually travels. A crawler has no session, so /api/share
 * serves it the community reef — which is the right thing for a stranger to
 * see anyway.
 */
export const metadata: Metadata = {
  metadataBase: new URL(ORIGIN),
  // The template gives every other page its own title; duplicate titles across
  // a site are one of the easiest ways to look thin to a crawler.
  title: { default: TITLE, template: '%s · Reef' },
  description: DESCRIPTION,
  applicationName: 'Reef',
  keywords: ['Nimiq', 'NIM', 'staking', 'Mini App', 'Nimiq Pay', 'aquarium', 'collectible'],
  alternates: { canonical: ORIGIN },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: ORIGIN,
    siteName: 'Reef',
    type: 'website',
    locale: 'en',
    alternateLocale: ['de', 'es'],
    images: [{ url: '/api/share', width: 1200, height: 630, alt: 'An aquarium filling as you stake' }],
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Reef', statusBarStyle: 'black-translucent' },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/api/share'],
  },
};

// Mini Apps run in a phone webview — no zoom, respect the notch.
/** Installable from Chrome and Edge on Windows, and Safari's Add to Dock on macOS. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a2739',
};

/**
 * Structured data. Claims only what is true — no rating, no author, no install
 * count. Inventing those is how a rich result turns into a manual penalty.
 */
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Reef',
  url: ORIGIN,
  description: DESCRIPTION,
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript',
  inLanguage: ['en', 'de', 'es'],
  image: `${ORIGIN}/api/share`,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  isAccessibleForFree: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </body>
    </html>
  );
}
