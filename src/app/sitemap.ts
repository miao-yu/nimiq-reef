import type { MetadataRoute } from 'next';

const ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'https://reef.nimiq.cafe';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: ORIGIN, changeFrequency: 'daily', priority: 1 },
    { url: `${ORIGIN}/community`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${ORIGIN}/preview`, changeFrequency: 'monthly', priority: 0.7 },
  ];
}
