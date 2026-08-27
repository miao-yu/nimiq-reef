#!/usr/bin/env node
/**
 * The rules that make traits mean something.
 *
 * These are invariants, not preferences. If a crown ever appears on a common
 * guppy, rarity stops being readable and every legendary already discovered is
 * devalued — and nothing in the type system would catch it.
 *
 * Run with tsx so it reads the real source rather than a build artefact.
 */
import { traitsFor, SHINY_ODDS, CREST_COUNT } from '../src/lib/tank/traits.ts';
import {
  faunaScale,
  grassScale,
  maturity,
  MATURE_DAYS,
  FAUNA_FLOOR,
  GRASS_FLOOR,
} from '../src/lib/tank/growth.ts';

const NAMES = ['bare', 'tuft', 'spikes', 'sail', 'plume', 'horn', 'antennae', 'crown'];
const CEILING = { common: 2, uncommon: 4, rare: 7, legendary: 8 };
const SAMPLE = 200_000;

let fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fail++;
};

const seen = { common: new Set(), uncommon: new Set(), rare: new Set(), legendary: new Set() };
let shiny = 0;
for (let s = 1; s <= SAMPLE; s++) {
  for (const tier of Object.keys(seen)) seen[tier].add(traitsFor(s, tier).crest);
  if (traitsFor(s, 'rare').shiny) shiny++;
}

for (const [tier, ceiling] of Object.entries(CEILING)) {
  const got = [...seen[tier]].sort((a, b) => a - b);
  check(
    `${tier} wears exactly its ${ceiling} crests`,
    got.length === ceiling && got.every((k, i) => k === i),
    got.map((k) => NAMES[k]).join(', '),
  );
}

check(
  'the crown is legendary and nothing else',
  seen.legendary.has(CREST_COUNT - 1) &&
    !['common', 'uncommon', 'rare'].some((t) => seen[t].has(CREST_COUNT - 1)),
);

// Loose bounds: this is a sample, not a proof, and a tight assert would fail
// on nothing more than a different sample size.
const rate = SAMPLE / shiny;
check(
  `shiny lands near 1 in ${SHINY_ODDS}`,
  rate > SHINY_ODDS * 0.75 && rate < SHINY_ODDS * 1.35,
  `1 in ${Math.round(rate)}`,
);

// A creature must be the same creature every time it is drawn, or the share
// card stops matching the tank.
const a = traitsFor(12345, 'rare');
const b = traitsFor(12345, 'rare');
check('traits are deterministic', JSON.stringify(a) === JSON.stringify(b));

// Neighbouring seeds must not produce neighbouring creatures: the first
// version banded a contact sheet into blocks of one colour.
const eyes = new Set();
for (let s = 1000; s < 1032; s++) eyes.add(traitsFor(s, 'legendary').eyes);
check('neighbouring seeds spread across the eye set', eyes.size >= 6, `${eyes.size} of 8 in 32 seeds`);

// --- growth ---

check('nothing is full size on arrival', maturity(0) === 0);
check(`everything is full size by day ${MATURE_DAYS}`, maturity(MATURE_DAYS) === 1);

let monotonic = true;
let bounded = true;
for (let d = -5; d <= 400; d++) {
  if (maturity(d) < maturity(d - 1)) monotonic = false;
  const f = faunaScale(d);
  const g = grassScale(d);
  if (f < FAUNA_FLOOR || f > 1 || g < GRASS_FLOOR || g > 1) bounded = false;
}
// A clock skew or a row written in the future must not invert a fish.
check('growth never runs backwards, including for negative ages', monotonic);
check('scales stay inside their bounds', bounded, `fauna ${FAUNA_FLOOR}..1, grass ${GRASS_FLOOR}..1`);

// Most of the change has to land in the first week or it is invisible day to
// day, which is the same as not growing at all.
check('over half the growth happens in the first week', maturity(7) > 0.5, maturity(7).toFixed(2));

console.log(fail === 0 ? '\nPASS — traits hold' : `\nFAIL (${fail})`);
process.exit(fail ? 1 : 0);
