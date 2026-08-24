#!/usr/bin/env node
/**
 * Exercise the planting rules against a running dev server.
 *
 * The cases that matter are 4-6: a locked species must be refused, a filled
 * plot must stay filled, and an uncleared plot must be refused. Those three are
 * the whole game — if any of them starts returning 200, planting is no longer
 * a decision.
 */
const B = process.env.GROVE_URL ?? 'http://127.0.0.1:3000';

const j = async (r) => ({ status: r.status, body: await r.json(), setCookie: r.headers.get('set-cookie') });
const post = (p, b, cookie) =>
  fetch(B + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(b),
  }).then(j);

const { body: w } = await j(await fetch(B + '/api/dev/wallet'));
const { body: ch } = await post('/api/auth/challenge', { address: w.address });
const { body: sig } = await post('/api/dev/wallet', { message: ch.message });
const verify = await post('/api/auth/verify', {
  code: ch.code, address: w.address, publicKey: sig.publicKey, signature: sig.signature,
});
const cookie = (verify.setCookie ?? '').split(';')[0];
console.log('1. signed in as', w.address);

const g0 = await j(await fetch(B + '/api/grove', { headers: { cookie } }));
console.log('2. fresh grove:', JSON.stringify({
  day: g0.body.day, daysStaked: g0.body.daysStaked,
  plotsUnlocked: g0.body.plotsUnlocked, species: g0.body.speciesUnlocked,
  free: g0.body.freePlots, chainOffline: g0.body.chainOffline,
}));

const locked = await post('/api/grove/plant', { species: 'elder', plot: 0 }, cookie);
console.log('3. plant a locked species:', locked.status, JSON.stringify(locked.body.error ?? locked.body));

const ok = await post('/api/grove/plant', { species: 'sprout', plot: 0 }, cookie);
console.log('4. plant sprout in plot 0:', ok.status, ok.status === 200 ? `${ok.body.plants.length} plant(s)` : JSON.stringify(ok.body));

const again = await post('/api/grove/plant', { species: 'sprout', plot: 0 }, cookie);
console.log('5. plant over it (permanence):', again.status, JSON.stringify(again.body.error ?? again.body));

const uncleared = await post('/api/grove/plant', { species: 'sprout', plot: 1 }, cookie);
console.log('6. plant in an uncleared plot:', uncleared.status, JSON.stringify(uncleared.body.error ?? uncleared.body));

const anon = await post('/api/grove/plant', { species: 'sprout', plot: 1 }, undefined);
console.log('7. plant with no session:', anon.status, JSON.stringify(anon.body.error ?? anon.body));

const pass =
  locked.status === 403 && ok.status === 200 && again.status === 409 &&
  uncleared.status === 403 && anon.status === 401;
console.log(pass ? '\nPASS — planting rules hold' : '\nFAIL — a rule did not hold');
process.exit(pass ? 0 : 1);
