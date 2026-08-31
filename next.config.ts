import { readFileSync } from 'node:fs';
import type { NextConfig } from 'next';

/*
 * The version, read from package.json at build time.
 *
 * Shown in the drawer so a bug report can name what it was looking at. Read
 * from the file rather than npm_package_version, which is only set when the
 * build happens to be started by an npm script.
 */
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const config: NextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: version },
  reactStrictMode: true,
  // Self-hosted on the VPS: build a self-contained server bundle so the box
  // only needs `node .next/standalone/server.js`, no npm install on deploy.
  output: 'standalone',
  // @nimiq/core ships WASM and a worker; let Node require it at runtime
  // instead of letting the bundler try to inline it.
  serverExternalPackages: ['@nimiq/core', '@napi-rs/canvas'],

  /**
   * Next marks a fully static page `s-maxage=31536000`. Behind a CDN that holds
   * the HTML shell for a year, so every deploy serves stale markup — which is
   * exactly why the rename to reef.nimiq.cafe kept showing the old title long
   * after the origin was correct.
   *
   * Page shells get a short shared cache instead. `_next/static` is excluded
   * because it is content-hashed and should stay immutable.
   */
  async headers() {
    return [
      {
        /**
         * Every API response is per-user and must never be shared.
         *
         * Sending *no* Cache-Control is not neutral — it is an invitation for
         * any intermediary to invent one. Cloudflare did exactly that: it
         * cached /api/reef and served one signed-in user's tank to everyone,
         * and cached /api/auth/session as `{"address":null}` so signed-in
         * users were told they were signed out.
         *
         * Note: Next applies *every* matching rule and the later one wins, so
         * ordering does not protect this — the page rule below must keep
         * excluding `api/` explicitly. Verified by observation: without the
         * exclusion, /api/reef came back `public, s-maxage=60`.
         */
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, private, max-age=0, must-revalidate' },
          { key: 'Vary', value: 'Cookie' },
        ],
      },
      {
        // `.+` not `.*`: this must not match the root, which is per-user and
        // gets its own private rule below. Relying on later-rule-wins for that
        // is a trap — the root is the one page where losing the race would
        // hand one visitor's session state to the next.
        source: '/((?!_next/|api/).+)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=60, must-revalidate' },
        ],
      },
      {
        /**
         * Two per-viewer pages: the reef screen, and a look — which shows a
         * creature only to somebody who has caught one.
         *
         * It renders the sign-in gate only for visitors who do not have a
         * session, which is what stopped every trip back from the collection
         * flashing it. That makes the page per-user, and the rule above would
         * happily let Cloudflare cache one visitor's copy for sixty seconds and
         * hand it to the next — an anonymous arrival would land on a page with
         * no gate and no way in.
         *
         * `Vary: Cookie` is not enough on its own here: Cloudflare does not
         * vary its cache on arbitrary request headers. `private` is what
         * actually keeps a shared cache out. No address or reef data is in this
         * HTML — only which of two faces to draw — but this is the same shape
         * of mistake that once served one signed-in user's tank to everyone.
         */
        source: '/look/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0, must-revalidate' },
          { key: 'Vary', value: 'Cookie' },
        ],
      },
      {
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0, must-revalidate' },
          { key: 'Vary', value: 'Cookie' },
        ],
      },
      {
        /*
         * Last, so it wins: Next applies every matching rule and the later one
         * takes precedence — the same behaviour that once re-opened the /api
         * hole when I assumed first-match.
         *
         * Validator logos come from a registry that changes a few times a year,
         * and re-fetching a 24KB image for every row of the pond list would
         * cost more than the rest of the page put together.
         */
        source: '/validator/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
};

export default config;
