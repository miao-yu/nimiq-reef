import type { MetadataRoute } from 'next';

const ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'https://reef.nimiq.cafe';

/**
 * Crawlers should index the two pages worth reading and skip the rest.
 *
 * /api is per-user JSON that returns 401 to anybody anonymous — indexing it
 * spends crawl budget to discover nothing. /open exists to get the app onto a
 * test device and would only ever be a confusing search result.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    // /r/ pages are the point of having a sitemap at all — they are the only
    // pages with distinct content. Everything under /api stays out: it is
    // per-user JSON that 401s anonymously, except the reef cards, which the
    // pages already reference as images.
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/open'] }],
    sitemap: `${ORIGIN}/sitemap.xml`,
    host: ORIGIN,
  };
}
