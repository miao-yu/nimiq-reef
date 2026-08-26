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
const { body: w } = await call('/api/dev/wallet');
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

// --- feeding a stranger is device gated ---
const noDevice = await post('/api/feed/give', { handle: 'someone' }, cookie);
check('giving without a device id is refused', noDevice.status === 400 && noDevice.body.reason === 'no-device');
const anon = await post('/api/feed/give', { handle: 'someone', device: 'a'.repeat(64) });
check('giving with no session is refused', anon.status === 401, `HTTP ${anon.status}`);

// --- nothing is reachable without a session ---
for (const [p, m] of [['/api/reef', 'GET'], ['/api/guide', 'GET'], ['/api/roll', 'POST']]) {
  const r = m === 'GET' ? await call(p) : await post(p, {});
  check(`${m} ${p} needs a session`, r.status === 401, `HTTP ${r.status}`);
}

console.log(fail === 0 ? '\nPASS — the loop holds' : `\nFAIL (${fail})`);
process.exit(fail ? 1 : 0);
