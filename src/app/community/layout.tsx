import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reefs living',
  description:
    'Every Reef filling from real Nimiq staking. Browse them, see what people have found, and feed one.',
  alternates: { canonical: '/community' },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
