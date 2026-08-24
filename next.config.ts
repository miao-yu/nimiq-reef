import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // The grove engine lives on the pool server; the browser never talks to it
  // directly and never sees GROVE_API_SECRET.
  env: {},
};

export default config;
