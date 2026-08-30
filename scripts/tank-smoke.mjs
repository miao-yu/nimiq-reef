#!/usr/bin/env node
/**
 * The rules that are the game. If any of these stops holding, the loop is
 * broken in a way no type checker will catch.
 */
const B = process.env.REEF_URL ?? 'http://127.0.0.1:3000';

const j = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})), setCookie: r.headers.get('set-cookie') });
const call = (p, opts = {}) => fetch(B + p, opts).then(j);
const post = (p, b, cookie) =>
  call(p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(b ?? {}) });

let fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fail++;
};

// --- sign in with the dev wallet ---
// A fresh wallet each run, so a rerun is not poisoned by the previous one.
const { body: w } = await call('/api/dev/wallet?fresh=1');
const { body: ch } = await post('/api/auth/challenge', { address: w.address });
const { body: sig } = await post('/api/dev/wallet', { message: ch.message });
const verify = await post('/api/auth/verify', { code: ch.code, address: w.address, publicKey: sig.publicKey, signature: sig.signature });
const cookie = (verify.setCookie ?? '').split(';')[0];
console.log(`\n  signed in as ${w.address}\n`);

const state = () => call('/api/reef', { headers: { cookie } }).then((r) => r.body);

// --- charges ---
const before = await state();
check('starts with three charges', before.charges === 3, `${before.charges}`);

const rolls = [];
for (let i = 0; i < 4; i++) rolls.push(await post('/api/roll', {}, cookie));
check('three rolls succeed', rolls.slice(0, 3).every((r) => r.status === 200));
check('the fourth is refused', rolls[3].status === 409, `HTTP ${rolls[3].status}`);
check('every roll produced a specimen', rolls.slice(0, 3).every((r) => r.body.discovered?.species));
check('a refused roll says when the next one lands', typeof rolls[3].body.nextChargeInMs === 'number');

const after = await state();
check('charges are spent, not merely counted', after.charges === 0, `${after.charges}`);

// --- the guide keeps everything ---
const guide = await call('/api/guide', { headers: { cookie } });
const discovered = guide.body.specimens.length;
check('guide holds every discovery', discovered >= 3, `${discovered}`);
check('locked species appear as silhouettes', guide.body.entries.some((e) => !e.discovered));

/*
 * The variant collection was always being drawn and never counted. These
 * numbers are derived from the seed and tier already stored per specimen, so
 * the assertion that matters is that they survive the trip out of the API —
 * the same pipeline gap that once dropped tier on the way to the client.
 */
const found = guide.body.entries.filter((e) => e.discovered);
const fauna = found.filter((e) => e.looksPossible > 0);
check('the guide counts distinct looks, not just fish',
  fauna.length > 0 && fauna.every((e) => e.looks >= 1 && e.looks <= e.count),
  found.map((e) => `${e.species} ${e.looks}/${e.count}`).join(', '));
check('and knows how many looks each tier can make',
  found.every((e) => e.looksPossible >= 1344 || e.looksPossible === 0),
  [...new Set(found.map((e) => e.looksPossible))].sort((a, b) => a - b).join(', '));
// Flora are drawn without crest, eyes or mouth, so a "looks" count for kelp
// would be counting parts that never appear.
check('flora claim no trait variety, because they have none',
  found.filter((e) => ['grass', 'kelp', 'fan', 'anemone', 'tubeworm'].includes(e.species))
       .every((e) => e.looksPossible === 0),
  found.filter((e) => e.looksPossible === 0).map((e) => e.species).join(', ') || 'none present');
check('shiny is reported rather than passing in silence',
  typeof guide.body.shiny === 'number' && found.every((e) => typeof e.shiny === 'number'),
  `lifetime ${guide.body.shiny}`);

const displayed = guide.body.specimens.find((s) => s.slot !== null);
const released = await post(`/api/specimen/${displayed.id}`, { action: 'release' }, cookie);
check('releasing succeeds', released.status === 200);
const afterRelease = await call('/api/guide', { headers: { cookie } });
check(
  'released specimen survives in the guide',
  afterRelease.body.specimens.length === discovered,
  `${afterRelease.body.specimens.length} of ${discovered}`,
);
check(
  'released specimen left the tank',
  afterRelease.body.specimens.find((s) => s.id === displayed.id).slot === null,
);

// --- feeding ---
const fed = await post('/api/feed', {}, cookie);
check('feeding own reef works', fed.status === 200 && fed.body.reef.fedToday === true);
const fedTwice = await post('/api/feed', {}, cookie);
check('feeding twice is idempotent, not an error', fedTwice.status === 200);

// --- feeding a stranger ---
// A device is no longer required to give; it is required to be *handed*
// somebody to give to. What still must hold is that the address is real and
// that a session is present.
// A checksum-valid address belonging to nobody. This used to be a real reef
// with real NIM staked on it, which is fine in a private repo and not fine in
// a public one — an address is public on chain, but hardcoding a specific
// person's into a test file ties them to this app for no reason.
const VALID = 'NQ32 0000 0000 0000 0000 0000 0000 0000 DEAD';

const junk = await post('/api/feed/give', { address: 'not-an-address' }, cookie);
check('giving to a malformed address is refused', junk.status === 400, `HTTP ${junk.status}`);

const typo = await post('/api/feed/give', { address: VALID.slice(0, -1) + 'N' }, cookie);
check('giving to a checksum typo is refused', typo.status === 400, `HTTP ${typo.status}`);

const anon = await post('/api/feed/give', { address: VALID, device: 'a'.repeat(64) });
check('giving with no session is refused', anon.status === 401, `HTTP ${anon.status}`);

/*
 * Candidates used to demand a device identifier and refuse without one, which
 * made the feature dark for every desktop visitor. It guarded very little: a
 * reef takes one 'fed' charge a day however many feeds arrive, so farming
 * wallets bought a vanity counter and cost the farmer discoverability.
 */
const candidates = await call('/api/feed/candidates', { headers: { cookie } });
check(
  'candidates are handed out in a plain browser',
  candidates.status === 200 && Array.isArray(candidates.body.candidates),
  `HTTP ${candidates.status}`,
);

/*
 * The look. Checked on the server because the client is the one place a lock
 * is only a suggestion — a chip that appears to work and does nothing is worse
 * than one that says no.
 */
const sand = await post('/api/reef/look', { floor: 'sand', wall: 'open' }, cookie);
check('a look you have earned is accepted', sand.status === 200 && sand.body.reef?.floor === 'sand',
  `HTTP ${sand.status}`);
const gated = await post('/api/reef/look', { wall: 'reef' }, cookie);
check('a look you have not earned is refused, not ignored', gated.status === 403, `HTTP ${gated.status}`);
const nonsense = await post('/api/reef/look', { floor: 'lava' }, cookie);
check('a look that does not exist is refused', nonsense.status === 400, `HTTP ${nonsense.status}`);
check('the reef reports what it has earned',
  typeof sand.body.reef?.earned?.species === 'number',
  JSON.stringify(sand.body.reef?.earned));

// --- nothing is reachable without a session ---
for (const [p, m] of [['/api/reef', 'GET'], ['/api/guide', 'GET'], ['/api/roll', 'POST']]) {
  const r = m === 'GET' ? await call(p) : await post(p, {});
  check(`${m} ${p} needs a session`, r.status === 401, `HTTP ${r.status}`);
}

console.log(fail === 0 ? '\nPASS — the loop holds' : `\nFAIL (${fail})`);
process.exit(fail ? 1 : 0);
