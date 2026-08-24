import type { Metadata, Viewport } from 'next';
import './globals.css';

const ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'https://grove.nimiq.cafe';
const DESCRIPTION = 'A garden that grows from your staking. Nothing here is simulated.';

/**
 * The card is what actually travels. A crawler has no session, so /api/share
 * serves it the community grove — which is the right thing for a stranger to
 * see anyway.
 */
export const metadata: Metadata = {
  metadataBase: new URL(ORIGIN),
  title: 'Nimiq Grove',
  description: DESCRIPTION,
  openGraph: {
    title: 'Nimiq Grove',
    description: DESCRIPTION,
    url: ORIGIN,
    siteName: 'Nimiq Grove',
    type: 'website',
    images: [{ url: '/api/share', width: 1200, height: 630, alt: 'A grove growing from staking' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nimiq Grove',
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
