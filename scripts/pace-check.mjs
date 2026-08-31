#!/usr/bin/env node
/**
 * How fast a creature crosses the glass, whatever the glass is.
 *
 * SPEED is a lap rate, not a speed — a lap takes the same time however wide
 * the tank is, so on a 3440px wallpaper a guppy peaked at 858 px/s against 97
 * on a phone. Nine times faster, and it read as fleeing rather than swimming.
 *
 * Pacing fixes that, and must never touch a still frame: a share card is
 * composed at 1200px and has to show the moment the player saw at 390px. Pace
 * the still and the two diverge, which is the one property this renderer is
 * built around.
 */
import { placeAt, paceFor, PACE_WIDTH, STILL_TIME } from '../src/lib/tank/motion.ts';

let fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fail++;
};

const FISH = { species: 'guppy', seed: 12345, tier: 'common', ageDays: 60 };
const tankOf = (w) => ({ x: 0, y: 0, w, h: 600, surfaceY: 40, groundY: 560 });

/** Peak horizontal speed in pixels per second, over a long enough window. */
function peak(width) {
  const tank = tankOf(width);
  const pace = paceFor(width, true);
  let most = 0;
  for (let t = 0; t < 40; t += 0.05) {
    const a = placeAt(FISH, tank, t, 0, 0, undefined, pace).x;
    const b = placeAt(FISH, tank, t + 0.05, 0, 0, undefined, pace).x;
    most = Math.max(most, Math.abs(b - a) / 0.05);
  }
  return most;
}

const phone = peak(PACE_WIDTH);
check('a phone is untouched by pacing', paceFor(PACE_WIDTH, true) === 1, `${phone.toFixed(0)} px/s`);

for (const w of [1440, 2560, 3440]) {
  const s = peak(w);
  // Without pacing this grew linearly with width; the cap is what proves it no
  // longer does. Twice the phone is calm; nine times was the bug.
  check(`a ${w}px wall stays near the phone's pace`, s < phone * 2,
    `${s.toFixed(0)} px/s vs ${phone.toFixed(0)}`);
}

check('a still frame is never paced',
  [390, 1200, 3440].every((w) => paceFor(w, false) === 1));

// The property the whole renderer exists for: a card composed wide shows the
// same moment, in the same place, as the phone it was captured from.
const fraction = (w) => {
  const tank = tankOf(w);
  return placeAt(FISH, tank, STILL_TIME, 0, 0, undefined, paceFor(w, false)).x / w;
};
check('a 1200px card frames the moment the phone showed',
  Math.abs(fraction(390) - fraction(1200)) < 0.01,
  `${fraction(390).toFixed(3)} vs ${fraction(1200).toFixed(3)}`);

console.log(fail === 0 ? '\nPASS — the pace holds' : `\nFAIL (${fail})`);
process.exit(fail === 0 ? 0 : 1);
