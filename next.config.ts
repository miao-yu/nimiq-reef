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
   * Page shells get a short shared cache instead. Deliberately excluded:
   * `_next/static`, which is content-hashed and should stay immutable, and
   * `api`, where responses are per-user and must keep whatever the route sets.
   */
  async headers() {
    return [
      {
        source: '/((?!_next/|api/).*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=60, must-revalidate' },
        ],
      },
    ];
  },
};

export default config;
