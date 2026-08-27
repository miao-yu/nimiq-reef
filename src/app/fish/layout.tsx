import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fishing',
  description: 'Pick a pond and cast. Every Nimiq validator is water of its own.',
  // Behind a session, and useless to anybody arriving from a search.
  robots: { index: false, follow: false },
};

export default function FishLayout({ children }: { children: React.ReactNode }) {
  return children;
}
