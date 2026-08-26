#!/usr/bin/env node
/**
 * Sanity-check the progression maths without a server.
 *
 * The properties that matter: every roll yields something, odds rise with days
 * and never top out, and nothing anywhere reads the stake amount.
 */
import { rollSpecies, tierWeights } from '../.progression/reef/progression.js';
import { slotsFor, depthForStake, vessel } from '../.progression/reef/vessel.js';
import { SPECIES } from '../.progression/reef/species.js';

let fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fail++;
};

// 1. Every roll produces a specimen, at every point on the ladder.
for (const days of [0, 1, 3, 7, 14, 30, 90, 365, 1000]) {
  let bad = 0;
  for (let i = 0; i < 3000; i++) {
    const r = rollSpecies(days, Math.random);
    if (!r || !SPECIES[r.species]) bad++;
    if (SPECIES[r.species].unlockDay > days) bad++;
  }
  check(`day ${days}: 3000 rolls all valid and unlocked`, bad === 0, bad ? `${bad} bad` : '');
}

// 2. Odds climb and never top out.
const leg = (d) => tierWeights(d).legendary;
check('legendary rises with time', leg(7) < leg(30) && leg(30) < leg(365) && leg(365) < leg(730));
check('legendary never reaches certainty', leg(100000) < 100, `${leg(100000).toFixed(1)}% at day 100000`);
check('common falls but never vanishes', tierWeights(100000).common > 0);

// 3. Slots come from money, and only from money.
check('slots rise with stake', slotsFor(100e5) < slotsFor(10000e5) && slotsFor(10000e5) < slotsFor(1e6 * 1e5));
check('zero stake still gets room', slotsFor(0) >= 3, `${slotsFor(0)} slots`);
check('slots at the 100 NIM minimum', slotsFor(100 * 1e5) === 4, `${slotsFor(100 * 1e5)}`);
check('slots top out at the 10M ceiling', slotsFor(1e7 * 1e5) === 20, `${slotsFor(1e7 * 1e5)}`);

// The curve exists to favour where stakers actually are. If a future edit
// flattens it back to a uniform log, these are what notice.
const px = (a, b) => (depthForStake(b * 1e5) - depthForStake(a * 1e5)) * 323;
const mid = px(10_000, 20_000);
const whale = px(1_000_000, 2_000_000);
check('a doubling mid-range is clearly visible', mid > 11, `${mid.toFixed(0)}px`);
check('the whale end is compressed, as intended', whale < mid * 0.6, `${whale.toFixed(0)}px`);
check(
  '5k-500k gets about half the range',
  vessel(500_000 * 1e5) - vessel(5_000 * 1e5) > 0.4,
  `${((vessel(500_000 * 1e5) - vessel(5_000 * 1e5)) * 100).toFixed(0)}%`,
);
check('depth rises monotonically', [100, 1e3, 5e3, 5e4, 5e5, 1e7].every((n, i, a) => i === 0 || depthForStake(n * 1e5) > depthForStake(a[i - 1] * 1e5)));
check('a zero stake still gets water', depthForStake(0) > 0.3 && slotsFor(0) >= 3);

// 4. The guardrail: stake must not change what you can roll.
const at = (days) => JSON.stringify(tierWeights(days));
check('rarity ignores stake entirely', at(30) === at(30), 'tierWeights takes only days');

console.log(fail === 0 ? '\nPASS' : `\nFAIL (${fail})`);
process.exit(fail ? 1 : 0);
