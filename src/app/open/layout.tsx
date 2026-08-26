import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Open in Nimiq Pay',
  description: 'Open Reef inside the Nimiq Pay app.',
  // A device-testing aid, not a page anybody should arrive at from a search.
  robots: { index: false, follow: false },
};

export default function OpenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
