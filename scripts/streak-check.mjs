/**
 * The community list and a reef page must show the same "days staked".
 *
 * They did not: the card counted every day a reef ever staked, while the reef
 * itself showed the unbroken run. One click changed the number under the same
 * words, and nobody would have noticed until somebody first broke a streak.
 *
 * So this seeds the shapes that tell the two definitions apart — a gap, a
 * break, an unobserved day — and asserts the SQL agrees with the walk.
 */
import mysql from 'mysql2/promise';
import { stakingStreak, STAKE_LOOKBACK_DAYS } from '../src/lib/reef/streak.ts';

const db = await mysql.createConnection({
  host: process.env.DB_HOST ?? '127.0.0.1',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

const day = (back) => new Date(Date.now() - back * 86400000).toISOString().slice(0, 10);

/** [days-ago, staked] — omitted days are days we never observed. */
const CASES = {
  'staking every day': [[0, 1], [1, 1], [2, 1], [3, 1]],
  'a break yesterday': [[0, 1], [1, 0], [2, 1], [3, 1]],
  'a gap we never watched': [[0, 1], [2, 1], [3, 1]],
  'stopped and never resumed': [[0, 0], [1, 1], [2, 1]],
  'never staked at all': [[0, 0], [1, 0]],
  'a break older than the window': [[0, 1], [1, 1], [STAKE_LOOKBACK_DAYS + 5, 0]],
};

let fail = 0;
const check = (name, ok, detail) => {
  if (!ok) fail++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const SQL = `SELECT COUNT(*) AS n FROM reef_days rd
  WHERE rd.address = ? AND rd.staked_luna > 0 AND rd.day >= ?
    AND rd.day > COALESCE((SELECT MAX(b.day) FROM reef_days b
      WHERE b.address = ? AND b.staked_luna <= 0 AND b.day >= ?), '1000-01-01')`;

for (const [name, rows] of Object.entries(CASES)) {
  const address = `NQ00 TEST ${Math.abs(hash(name)).toString(36).toUpperCase().padStart(4, '0').slice(0, 4)} STRK ${'0000'} 0000 0000 0000 0000`;
  await db.execute('DELETE FROM reef_days WHERE address = ?', [address]);
  await db.execute('DELETE FROM reefs WHERE address = ?', [address]);
  await db.execute('INSERT INTO reefs (address, first_day) VALUES (?, ?)', [address, day(400)]);
  for (const [back, staked] of rows) {
    await db.execute(
      'INSERT INTO reef_days (address, day, staked_luna) VALUES (?, ?, ?)',
      [address, day(back), staked ? 100_000n * 100_000n : 0],
    );
  }

  const since = day(STAKE_LOOKBACK_DAYS);
  const [[{ n: sql }]] = await db.query(SQL, [address, since, address, since]);
  // The walk, over exactly the rows the SQL just looked at.
  const [observed] = await db.query(
    'SELECT day, staked_luna FROM reef_days WHERE address = ? AND day >= ?',
    [address, since],
  );
  const walk = stakingStreak(
    new Map(observed.map((r) => [
      r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day),
      Number(r.staked_luna),
    ])),
  );
  check(name, Number(sql) === walk, `sql=${sql} walk=${walk}`);

  await db.execute('DELETE FROM reef_days WHERE address = ?', [address]);
  await db.execute('DELETE FROM reefs WHERE address = ?', [address]);
}

function hash(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

await db.end();
console.log(fail === 0 ? '\nPASS — both definitions agree' : `\nFAIL (${fail})`);
process.exit(fail === 0 ? 0 : 1);
