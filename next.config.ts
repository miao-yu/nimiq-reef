import type { NextConfig } from 'next';

const config: NextConfig = {
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
         * cached /api/grove and served one signed-in user's tank to everyone,
         * and cached /api/auth/session as `{"address":null}` so signed-in
         * users were told they were signed out.
         *
         * This must stay ahead of the page rule below; the first match wins.
         */
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, private, max-age=0, must-revalidate' },
          { key: 'Vary', value: 'Cookie' },
        ],
      },
      {
        source: '/((?!_next/).*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=60, must-revalidate' },
        ],
      },
    ];
  },
};

export default config;
