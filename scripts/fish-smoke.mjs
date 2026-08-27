#!/usr/bin/env node
/**
 * Fishing: the rules a render will not show.
 *
 * The minigame is client-authoritative on purpose — claiming a hit gets the
 * same roll the old button gave for the same charge, so cheating only skips
 * the fun. What must hold is everything around it: charges are spent, a miss
 * costs one *after* the daily forgiveness, and the pond cannot change tier.
 */
const B = process.env.REEF_URL ?? 'http://127.0.0.1:3000';
const j = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})), setCookie: r.headers.get('set-cookie') });
const call = (p, o = {}) => fetch(B + p, o).then(j);
const post = (p, b, cookie) =>
  call(p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(b ?? {}) });

/**
 * Real play cannot settle twice inside about four seconds — a cast is 0.7s out,
 * 0.5s sinking and at least 3s of waiting — so the endpoint refuses anything
 * faster than 1.5s apart. The test has to keep that cadence or it is testing
 * the throttle rather than the game.
 */
const beat = () => new Promise((r) => setTimeout(r, 1700));

let fail = 0;
const check = (n, ok, d = '') => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fail++; };

const { body: w } = await call('/api/dev/wallet?fresh=1');
const { body: ch } = await post('/api/auth/challenge', { address: w.address });
const { body: sig } = await post('/api/dev/wallet', { message: ch.message });
const v = await post('/api/auth/verify', { code: ch.code, address: w.address, publicKey: sig.publicKey, signature: sig.signature });
const cookie = (v.setCookie ?? '').split(';')[0];
console.log(`\n  signed in as ${w.address}\n`);

const anon = await post('/api/fish', { pond: w.address, outcome: 'landed' });
check('fishing needs a session', anon.status === 401, `HTTP ${anon.status}`);

const { status: pStatus, body: pondsBody } = await call('/api/ponds', { headers: { cookie } });
check('ponds list loads', pStatus === 200 && Array.isArray(pondsBody.ponds), `HTTP ${pStatus}`);
const pond = pondsBody.ponds?.[0];
if (!pond) { console.log('\n  SKIP — no ponds from the node'); process.exit(fail ? 1 : 0); }
check('every pond has water and a face', pondsBody.ponds.every((p) => p.water && p.label && p.address));

/*
 * Ponds must be the *elected* set, not merely the active one.
 *
 * getActiveValidators returns everything not deactivated — 37 against the 29
 * the election actually chose — and the difference is invisible in the UI. The
 * slots of an elected set always sum to the policy total, so this catches a
 * silent slip back to the wrong call.
 */
const { Policy } = await import('@nimiq/core');
const slots = pondsBody.ponds.reduce((n, p) => n + (p.slots ?? 0), 0);
check('ponds are the elected set', slots === Policy.SLOTS, `${slots} slots of ${Policy.SLOTS}`);

const junk = await post('/api/fish', { pond: 'not-an-address', outcome: 'landed' }, cookie);
check('a malformed pond is refused', junk.status === 400, `HTTP ${junk.status}`);

const badOutcome = await post('/api/fish', { pond: pond.address, outcome: 'whatever' }, cookie);
check('an unknown outcome is refused', badOutcome.status === 400, `HTTP ${badOutcome.status}`);

const before = (await call('/api/reef', { headers: { cookie } })).body.charges;

// First miss of the day is free.
const miss1 = await post('/api/fish', { pond: pond.address, outcome: 'missed' }, cookie);
check('the first miss of the day is forgiven', miss1.status === 200 && miss1.body.forgiven === true);
check('and costs no charge', miss1.body.reef.charges === before, `${before} -> ${miss1.body.reef.charges}`);

await beat();
const miss2 = await post('/api/fish', { pond: pond.address, outcome: 'missed' }, cookie);
check('the second miss is not forgiven', miss2.status === 200 && miss2.body.forgiven === false);
check('and does cost a charge', miss2.body.reef.charges === before - 1, `${before} -> ${miss2.body.reef.charges}`);

await beat();
const landed = await post('/api/fish', { pond: pond.address, outcome: 'landed' }, cookie);
check('landing produces a specimen', landed.status === 200 && Boolean(landed.body.caught?.species), `HTTP ${landed.status}`);
check('the catch carries its blurb', Boolean(landed.body.caught?.blurb), landed.body.caught?.label);
check('landing costs a charge', landed.body.reef.charges === before - 2, `${before - 1} -> ${landed.body.reef.charges}`);

// Spend the rest, then confirm it stops.
let guard = 0;
while ((await call('/api/reef', { headers: { cookie } })).body.charges > 0 && guard++ < 6) {
  await beat();
  await post('/api/fish', { pond: pond.address, outcome: 'landed' }, cookie);
}
await beat();
const empty = await post('/api/fish', { pond: pond.address, outcome: 'landed' }, cookie);
check('fishing with no charges is refused', empty.status === 409, `HTTP ${empty.status}`);

// A burst must not drain the account. The client used to fire one of these per
// animation frame; the server now refuses the flood on its own.
const burst = await Promise.all(
  Array.from({ length: 6 }, () => post('/api/fish', { pond: pond.address, outcome: 'missed' }, cookie)),
);
const accepted = burst.filter((r) => r.status === 200).length;
check('a burst of settles is throttled', accepted <= 1, `${accepted} of 6 accepted`);

console.log(fail === 0 ? '\nPASS — fishing holds' : `\nFAIL (${fail})`);
process.exit(fail ? 1 : 0);
