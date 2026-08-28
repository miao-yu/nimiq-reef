#!/usr/bin/env node
/**
 * Staking from a browser: the server builds, the Hub signs, the server relays.
 *
 * The Hub cannot be scripted, so the middle step is stubbed with a local key —
 * what is under test is the two ends. The relay checks matter most: without
 * them /api/stake/send is an open door into the Nimiq network.
 */
import { Address, KeyPair, Transaction, TransactionBuilder } from '@nimiq/core';

const B = process.env.REEF_URL ?? 'http://127.0.0.1:3000';
const j = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})), setCookie: r.headers.get('set-cookie') });
const call = (p, o = {}) => fetch(B + p, o).then(j);
const post = (p, b, cookie) =>
  call(p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(b ?? {}) });

let fail = 0;
const check = (n, ok, d = '') => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fail++; };
const hex = (b) => Buffer.from(b).toString('hex');

const { body: w } = await call('/api/dev/wallet?fresh=1');
const { body: ch } = await post('/api/auth/challenge', { address: w.address });
const { body: sig } = await post('/api/dev/wallet', { message: ch.message });
const v = await post('/api/auth/verify', { code: ch.code, address: w.address, publicKey: sig.publicKey, signature: sig.signature });
const cookie = (v.setCookie ?? '').split(';')[0];
console.log(`\n  signed in as ${w.address}\n`);

const anon = await post('/api/stake/build', { value: 10_000_000 });
check('building needs a session', anon.status === 401, `HTTP ${anon.status}`);

const tooSmall = await post('/api/stake/build', { value: 1 }, cookie);
check('below the protocol minimum is refused', tooSmall.status === 400, `HTTP ${tooSmall.status}`);

const noValidator = await post('/api/stake/build', { value: 10_000_000 }, cookie);
check('a new position without a validator is refused', noValidator.status === 400, `HTTP ${noValidator.status}`);

const badValidator = await post('/api/stake/build', { value: 10_000_000, delegation: 'NQ00 nope' }, cookie);
check('a malformed validator address is refused', badValidator.status === 400, `HTTP ${badValidator.status}`);

const { body: vals } = await call('/api/validators');
const validator = vals.validators?.[0]?.address;
if (!validator) {
  console.log('  SKIP  no validators from the node — is it reachable?');
  process.exit(fail ? 1 : 0);
}

const built = await post('/api/stake/build', { value: 10_000_000, delegation: validator }, cookie);
check('a valid request builds', built.status === 200 && typeof built.body.raw === 'string', `HTTP ${built.status} ${built.body.error ?? ''}`);
if (built.status === 200) {
  const tx = Transaction.deserialize(Uint8Array.from(Buffer.from(built.body.raw, 'hex')));
  const plain = tx.toPlain();
  check('built for the signed-in address', plain.sender.replace(/\s/g, '') === w.address.replace(/\s/g, ''));
  check('built to the staking contract', plain.recipient.startsWith('NQ77 0000'), plain.recipient);
  check('built for the right value', plain.value === 10_000_000, String(plain.value));

  /*
   * The signing screen needs the validator by name, not just in the bytes.
   *
   * A create-staker transaction carries its delegation in the data; an
   * add-stake carries only the staker, and the Keyguard refuses that outright
   * with "No delegation or validatorAddress provided" rather than show an
   * unlabelled confirmation. So the build has to hand the validator back for
   * the client to pass along.
   */
  check(
    'the build names the validator for the signing screen',
    typeof built.body.delegation === 'string' && built.body.delegation.startsWith('NQ'),
    String(built.body.delegation),
  );
  check('and says whether it has a logo to show', typeof built.body.delegationLogo === 'boolean');
}

// --- the relay must refuse anything that is not this user staking ---
const junk = await post('/api/stake/send', { raw: 'zzzz' }, cookie);
check('a malformed transaction is refused', junk.status === 400, `HTTP ${junk.status}`);

const stranger = KeyPair.generate();
const strangerAddr = stranger.toAddress();
const notMine = TransactionBuilder.newCreateStaker(strangerAddr, Address.fromString(validator), 10_000_000n, 0n, 1, 24);
const relayOther = await post('/api/stake/send', { raw: hex(notMine.serialize()) }, cookie);
check('a transaction from another address is refused', relayOther.status === 400, `HTTP ${relayOther.status} ${relayOther.body.error ?? ''}`);

const plainSend = new Transaction(
  Address.fromString(w.address), null, null, strangerAddr, null, null, 100_000n, 0n, null, 1, 24,
);
const relayPayment = await post('/api/stake/send', { raw: hex(plainSend.serialize()) }, cookie);
check('an ordinary payment is refused — this is not a general relay',
  relayPayment.status === 400 && /staking/i.test(relayPayment.body.error ?? ''), `HTTP ${relayPayment.status} ${relayPayment.body.error ?? ''}`);

const relayAnon = await post('/api/stake/send', { raw: hex(plainSend.serialize()) });
check('relaying needs a session', relayAnon.status === 401, `HTTP ${relayAnon.status}`);

console.log(fail === 0 ? '\nPASS — staking holds' : `\nFAIL (${fail})`);
process.exit(fail ? 1 : 0);
