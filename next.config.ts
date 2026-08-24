import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // Self-hosted on the VPS: build a self-contained server bundle so the box
  // only needs `node .next/standalone/server.js`, no npm install on deploy.
  output: 'standalone',
};

export default config;
