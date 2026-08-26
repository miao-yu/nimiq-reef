#!/usr/bin/env node
/**
 * Feeding across two reefs.
 *
 * tank-smoke covers one wallet, so it can only ever test the refusals. Giving
 * needs somebody to give to, which needs a second signed-in wallet — hence a
 * separate script rather than a longer one.
 *
 * What matters here is the asymmetry decided on 26 Aug: a device identifier is
 * required to be *handed* a stranger, not to give. So a browser with no device
 * can feed a reef whose address the user brought with them, once a day.
 */
const B = process.env.REEF_URL ?? 'http://127.0.0.1:3000';

const j = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})), setCookie: r.headers.get('set-cookie') });
const call = (p, o = {}) => fetch(B + p, o).then(j);
const post = (p, b, cookie) =>
  call(p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(b ?? {}) });

let fail = 0;
const check = (n, ok, d = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fail++;
};

/** A fresh wallet, signed in, with its reef row created. */
async function signIn() {
  const { body: w } = await call('/api/dev/wallet?fresh=1');
  const { body: ch } = await post('/api/auth/challenge', { address: w.address });
  const { body: sig } = await post('/api/dev/wallet', { message: ch.message });
  const v = await post('/api/auth/verify', {
    code: ch.code, address: w.address, publicKey: sig.publicKey, signature: sig.signature,
  });
  const cookie = (v.setCookie ?? '').split(';')[0];
  await call('/api/reef', { headers: { cookie } });
  return { address: w.address, cookie };
}

const a = await signIn();
const b = await signIn();
console.log(`\n  ${b.address}\n  feeds ${a.address}\n`);

const fed = await post('/api/feed/give', { address: a.address }, b.cookie);
check('a browser with no device can feed a reef it reached by address',
  fed.status === 200, `HTTP ${fed.status}${fed.body.error ? ' ' + fed.body.error : ''}`);

const aState = await call('/api/reef', { headers: { cookie: a.cookie } });
check('the fed reef sees it', aState.body.receivedToday === 1, `receivedToday=${aState.body.receivedToday}`);

const again = await post('/api/feed/give', { address: a.address }, b.cookie);
check('a second give the same day is refused', again.status === 409, `HTTP ${again.status}`);

// The compact form is what a URL carries, so it has to be accepted everywhere
// the spaced form is.
const c = await signIn();
const compact = await post('/api/feed/give', { address: a.address.replace(/ /g, '') }, c.cookie);
check('the compact URL form is accepted', compact.status === 200, `HTTP ${compact.status}`);

const self = await post('/api/feed/give', { address: b.address }, b.cookie);
check('feeding your own reef is refused', self.status === 400, `HTTP ${self.status}`);

console.log(fail === 0 ? '\nPASS — feeding holds' : `\nFAIL (${fail})`);
process.exit(fail ? 1 : 0);
