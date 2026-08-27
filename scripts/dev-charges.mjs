#!/usr/bin/env node
/**
 * Give the local dev account its charges back.
 *
 * Charges are a replay of the `rolls` table, so clearing your rows refills the
 * bucket. Also clears the day's forgiven miss, so the first-miss-is-free path
 * can be tested again without waiting for UTC midnight.
 *
 * Local only. It reads .env.local, which points at the development database —
 * it has no way to reach production and should never be given one.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import mysql from 'mysql2/promise';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dotenv = join(root, '.env.local');
if (!existsSync(dotenv)) {
  console.error('No .env.local — this script is for local development only.');
  process.exit(1);
}
for (const line of readFileSync(dotenv, 'utf8').split('\n')) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const conn = await mysql.createConnection({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const [reefs] = await conn.query('SELECT address FROM reefs ORDER BY last_seen_at DESC LIMIT 1');
const address = process.argv[2] ?? reefs[0]?.address;
if (!address) {
  console.error('No reef found. Sign in once first.');
  process.exit(1);
}

const [rolls] = await conn.execute('DELETE FROM rolls WHERE address = ?', [address]);
const [misses] = await conn.execute('DELETE FROM forgiven_misses WHERE address = ?', [address]);
console.log(`  ${address}`);
console.log(`  cleared ${rolls.affectedRows} rolls and ${misses.affectedRows} forgiven misses`);
console.log('  charges are back to 3 — reload the page');
await conn.end();
