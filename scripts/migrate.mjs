#!/usr/bin/env node
/**
 * Apply SQL files in migrations/ in filename order, once each.
 *
 * Deliberately tiny: no ORM, no rollback. Migrations are append-only and
 * forward-only, which is the right trade for a four-week build.
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import mysql from 'mysql2/promise';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Load .env.local the way `next dev` does.
 *
 * Without this the script fails on a missing DB_USER while the app beside it
 * runs fine, which reads as a broken database rather than a missing variable —
 * it sent me chasing the wrong bug once already. Real environment variables
 * still win, so the deploy script's `env $(...)` is unaffected.
 */
const dotenv = join(root, '.env.local');
if (existsSync(dotenv)) {
  for (const line of readFileSync(dotenv, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

function env(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`Missing env ${name}`);
  return value;
}

const conn = await mysql.createConnection({
  host: env('DB_HOST', '127.0.0.1'),
  port: Number(env('DB_PORT', '3306')),
  user: env('DB_USER'),
  password: env('DB_PASSWORD'),
  database: env('DB_NAME'),
  multipleStatements: true,
});

await conn.query(`
  CREATE TABLE IF NOT EXISTS migrations (
    name       VARCHAR(255) NOT NULL,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (name)
  ) ENGINE=InnoDB
`);

const [done] = await conn.query('SELECT name FROM migrations');
const applied = new Set(done.map((r) => r.name));

const files = (await readdir(join(root, 'migrations'))).filter((f) => f.endsWith('.sql')).sort();

let ran = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log(`  = ${file}`);
    continue;
  }
  const sql = await readFile(join(root, 'migrations', file), 'utf8');
  await conn.query(sql);
  await conn.query('INSERT INTO migrations (name) VALUES (?)', [file]);
  console.log(`  + ${file}`);
  ran++;
}

console.log(ran === 0 ? 'up to date' : `applied ${ran}`);
await conn.end();
