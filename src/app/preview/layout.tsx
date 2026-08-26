import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Preview',
  description:
    'Drag a year of Nimiq staking into ten seconds and watch a reef fill with life. ' +
    'A simulation of how species and rarity unlock over time.',
  alternates: { canonical: '/preview' },
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
