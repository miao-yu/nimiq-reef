import 'server-only';
import mysql, { type Pool } from 'mysql2/promise';
import { env } from './env';

let pool: Pool | undefined;

/** Created on first query, so builds succeed without a database present. */
export function db(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      ...env.db,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      timezone: 'Z',
    });
  }
  return pool;
}
