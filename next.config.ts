import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // Self-hosted on the VPS: build a self-contained server bundle so the box
  // only needs `node .next/standalone/server.js`, no npm install on deploy.
  output: 'standalone',
  // @nimiq/core ships WASM and a worker; let Node require it at runtime
  // instead of letting the bundler try to inline it.
  serverExternalPackages: ['@nimiq/core'],
};

export default config;
