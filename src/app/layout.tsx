import type { Metadata, Viewport } from 'next';
import './globals.css';

const ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'https://reef.nimiq.cafe';
const DESCRIPTION = 'A tank that fills as you stake. Nothing here is simulated.';

/**
 * The card is what actually travels. A crawler has no session, so /api/share
 * serves it the community reef — which is the right thing for a stranger to
 * see anyway.
 */
export const metadata: Metadata = {
  metadataBase: new URL(ORIGIN),
  title: 'Reef',
  description: DESCRIPTION,
  openGraph: {
    title: 'Reef',
    description: DESCRIPTION,
    url: ORIGIN,
    siteName: 'Reef',
    type: 'website',
    images: [{ url: '/api/share', width: 1200, height: 630, alt: 'An aquarium filling as you stake' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reef',
    description: DESCRIPTION,
    images: ['/api/share'],
  },
};

// Mini Apps run in a phone webview — no zoom, respect the notch.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
