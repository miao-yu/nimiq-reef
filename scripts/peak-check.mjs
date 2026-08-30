#!/usr/bin/env node
/**
 * A broken streak costs odds, never access.
 *
 * This is the assertion the codebase has been bitten for lacking twice: a unit
 * test on the roll function passed while the pipeline dropped the value on the
 * way through. So the first half of this runs against the live API and reads
 * what /api/reef actually returns, not what a function returns in isolation.
 *
 * The staking history is written straight to MySQL because there is no dev
 * route for it, and inventing one would put a test-only door in production.
 */
import mysql from 'mysql2/promise';
import { rollSpecies } from '../src/lib/reef/progression.ts';
import { SPECIES } from '../src/lib/reef/species.ts';

const B = process.env.REEF_URL ?? 'http://127.0.0.1:3000';
const j = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})), setCookie: r.headers.get('set-cookie') });
const call = (p, o = {}) => fetch(B + p, o).then(j);
const post = (p, b, cookie) =>
  call(p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(b ?? {}) });

let fail = 0;
const check = (n, ok, d = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fail++;
};

async function signIn() {
  const { body: w } = await call('/api/dev/wallet?fresh=1');
  const { body: ch } = await post('/api/auth/challenge', { address: w.address });
  const { body: sig } = await post('/api/dev/wallet', { message: ch.message });
  const v = await post('/api/auth/verify', {
    code: ch.code, address: w.address, publicKey: sig.publicKey, signature: sig.signature,
  });
  const cookie = (v.setCookie ?? '').split(';')[0];
  await call('/api/reef', { headers: { cookie } });      // creates the reef row
  return { address: w.address, cookie };
}

const db = await mysql.createConnection({
  host: process.env.DB_HOST ?? '127.0.0.1',
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
});
const day = (back) => new Date(Date.now() - back * 86400000).toISOString().slice(0, 10);

// --- a reef that reached day 365 and is currently on a 30-day run ---
const me = await signIn();
for (let i = 0; i < 30; i++) {
  await db.execute(
    'INSERT INTO reef_days (address, day, staked_luna) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE staked_luna = VALUES(staked_luna)',
    [me.address, day(i), 100_000n * 100_000n],
  );
}
await db.execute('UPDATE reefs SET peak_streak = 365 WHERE address = ?', [me.address]);

const state = await call('/api/reef', { headers: { cookie: me.cookie } });
check('the pipeline carries the peak, not just the streak',
  state.body.peakStreak === 365, `peakStreak=${state.body.peakStreak}`);
check('the live streak is unchanged by it',
  state.body.daysStaked === 30, `daysStaked=${state.body.daysStaked}`);
check('the unlock set follows the peak, so nothing was confiscated',
  state.body.speciesUnlocked?.length === Object.keys(SPECIES).length,
  `${state.body.speciesUnlocked?.length} of ${Object.keys(SPECIES).length}`);

// --- and the odds follow the live streak ---
const sample = (peak, current, n = 60000) => {
  let seed = 4242;
  const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const tiers = new Set();
  for (let i = 0; i < n; i++) tiers.add(rollSpecies({ peak, current }, rng).tier);
  return tiers;
};

/*
 * Day-zero weights are 92/8 common/uncommon — rare and legendary are zero, not
 * merely unlikely. So "the odds dropped" means those two tiers are unreachable
 * until the streak rebuilds, however high the peak is.
 */
const broken = sample(365, 0);
check('a broken streak cannot reach rare or legendary — the odds did drop',
  !broken.has('rare') && !broken.has('legendary'), [...broken].sort().join(','));

// A pleasant side effect worth pinning: at zero streak the reef still draws
// from every common and uncommon it ever unlocked, not the two a beginner has.
check('but it still draws from the whole set it earned',
  broken.has('common') && broken.has('uncommon'), [...broken].sort().join(','));

const rebuilt = sample(365, 30);
check('rebuilding to day 30 reaches legendary again, without another 365 days',
  rebuilt.has('legendary'), [...rebuilt].sort().join(','));

// Peak 10 is below the shark at day 14, which is the first legendary.
const honest = sample(10, 10);
check('a reef that never got there cannot roll what it has not earned',
  !honest.has('legendary'), [...honest].sort().join(','));

await db.execute('DELETE FROM reef_days WHERE address = ?', [me.address]);
await db.end();
console.log(fail === 0 ? '\nPASS — a break costs odds, not access' : `\nFAIL (${fail})`);
process.exit(fail === 0 ? 0 : 1);
