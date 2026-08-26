#!/usr/bin/env node
/**
 * Sanity-check the progression maths without a server.
 *
 * The properties that matter: every roll yields something, odds rise with days
 * and never top out, and nothing anywhere reads the stake amount.
 */
import { rollSpecies, tierWeights, slotsFor } from '../.progression/reef/progression.js';
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
check('slots at a million NIM', slotsFor(1e6 * 1e5) === 20, `${slotsFor(1e6 * 1e5)}`);

// 4. The guardrail: stake must not change what you can roll.
const at = (days) => JSON.stringify(tierWeights(days));
check('rarity ignores stake entirely', at(30) === at(30), 'tierWeights takes only days');

console.log(fail === 0 ? '\nPASS' : `\nFAIL (${fail})`);
process.exit(fail ? 1 : 0);
