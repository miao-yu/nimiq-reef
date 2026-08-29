#!/usr/bin/env node
/**
 * The staking streak, which gates sixteen species and is now shown nowhere.
 *
 * That is exactly why it is worth pinning down. It used to have a second
 * definition in SQL for the community sort, and the two had already silently
 * diverged; that sort is gone, so this is the only definition left and nothing
 * on screen would reveal it going wrong — a player would just quietly stop
 * unlocking things.
 *
 * Pure, so it needs no database and no server.
 */
import { stakingStreak, STAKE_LOOKBACK_DAYS } from '../src/lib/reef/streak.ts';

const TODAY = '2026-03-15';
const back = (n) => new Date(Date.parse(`${TODAY}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);

/** [days-ago, staked] — days left out are days we never observed. */
const CASES = [
  ['staking every day', [[0, 1], [1, 1], [2, 1], [3, 1]], 4],
  ['a break yesterday resets it', [[0, 1], [1, 0], [2, 1], [3, 1]], 1],
  ['a gap we never watched is forgiven', [[0, 1], [2, 1], [3, 1]], 3],
  ['an outage today does not reset it', [[1, 1], [2, 1]], 2],
  ['stopped and never resumed', [[0, 0], [1, 1], [2, 1]], 0],
  ['never staked at all', [[0, 0], [1, 0]], 0],
  ['a break beyond the window cannot be seen', [[0, 1], [1, 1], [STAKE_LOOKBACK_DAYS + 5, 0]], 2],
];

let fail = 0;
for (const [name, rows, want] of CASES) {
  const observed = new Map(rows.map(([d, staked]) => [back(d), staked ? 100_000 : 0]));
  const got = stakingStreak(observed, STAKE_LOOKBACK_DAYS, TODAY);
  const ok = got === want;
  if (!ok) fail++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name} — ${got}${ok ? '' : ` (wanted ${want})`}`);
}

console.log(fail === 0 ? '\nPASS — the streak holds' : `\nFAIL (${fail})`);
process.exit(fail === 0 ? 0 : 1);
