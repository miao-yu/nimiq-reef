#!/usr/bin/env node
/**
 * The charge bucket, which decides how often anybody can play.
 *
 * Written after a production bug: a reef holding a bonus charge in the current
 * epoch could cast without limit. Every spend clamped the running level at
 * zero, so overdraft was forgiven, and the single grant that sorted after them
 * added one back — for ever. One player took eight casts from two charges
 * before it was noticed.
 *
 * Pure: no server, no database.
 */
import { chargesFrom, MAX_CHARGES } from '../src/lib/reef/charges.ts';

let fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fail++;
};

const spend = (epoch, n = 1) => Array.from({ length: n }, () => ({ epoch, delta: -1 }));
const grant = (epoch) => ({ epoch, delta: +1 });

/** How many casts a ledger allows before the gate refuses, capped so a bug cannot hang this. */
function castsAllowed(events, epoch, cap = 40) {
  const ledger = [...events];
  let taken = 0;
  while (taken < cap) {
    if (chargesFrom(ledger, epoch, 0).available < 1) break;
    ledger.push({ epoch, delta: -1 });
    taken++;
  }
  return taken;
}

check('a fresh reef gets exactly the bucket', castsAllowed([], 1317) === MAX_CHARGES,
  `${castsAllowed([], 1317)} of ${MAX_CHARGES}`);

// The production case, to the row: three spends an epoch back, one the epoch
// after, and a single 'fed' grant in the current epoch.
const real = [...spend(1315, 3), ...spend(1316, 1), grant(1317)];
check('a bonus charge does not become an unlimited supply',
  castsAllowed(real, 1317) === 2, `${castsAllowed(real, 1317)} casts allowed, expected 2`);

check('two grants give two extra casts, not infinity',
  castsAllowed([grant(1317), grant(1317)], 1317) === MAX_CHARGES,
  `${castsAllowed([grant(1317), grant(1317)], 1317)}`);

/*
 * Order inside an epoch does change the answer, and that is correct rather
 * than a defect: a grant arriving at a full bucket is discarded, so it matters
 * whether it lands before or after a spend. chargeEvents selects only the
 * epoch, so within one the order is spends-then-grants — the generous reading,
 * and the one worth pinning so a future reorder is a deliberate decision.
 */
const spentFirst = chargesFrom([...spend(1317, 2), grant(1317)], 1317, 0).available;
const grantFirst = chargesFrom([grant(1317), ...spend(1317, 2)], 1317, 0).available;
check('a grant at a full bucket is discarded, not banked', grantFirst === 1, `${grantFirst}`);
check('and a grant after a spend is kept', spentFirst === 2, `${spentFirst}`);

// A debt survives until epochs repay it, rather than vanishing at zero.
const overdrawn = spend(1317, 6);
check('overdraft is not forgiven the moment the epoch turns',
  chargesFrom(overdrawn, 1318, 0).available === 0,
  `${chargesFrom(overdrawn, 1318, 0).available}`);

check('but it does repay, given enough epochs',
  chargesFrom(overdrawn, 1330, 0).available === MAX_CHARGES,
  `${chargesFrom(overdrawn, 1330, 0).available}`);

check('the bucket never exceeds its cap',
  chargesFrom([grant(1316), grant(1317)], 1320, 0).available === MAX_CHARGES);

console.log(fail === 0 ? '\nPASS — the bucket holds' : `\nFAIL (${fail})`);
process.exit(fail === 0 ? 0 : 1);
