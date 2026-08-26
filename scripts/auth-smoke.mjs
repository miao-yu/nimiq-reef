const B = process.env.REEF_URL ?? 'http://127.0.0.1:3000';
const j = async (r) => ({ status: r.status, body: await r.json(), setCookie: r.headers.get('set-cookie') });
const post = (p, b) => fetch(B + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(j);

const { body: w } = await j(await fetch(B + '/api/dev/wallet'));
console.log('1. dev wallet address:', w.address);

const { body: ch } = await post('/api/auth/challenge', { address: w.address });
console.log('2. challenge issued, code =', ch.code.slice(0, 12) + '…');
console.log('   what the user reads in Nimiq Pay before approving:');
ch.message.split('\n').forEach((l) => console.log('      │', l));

const { body: sig } = await post('/api/dev/wallet', { message: ch.message });
console.log('3. wallet signed it');

const ok = await post('/api/auth/verify', { code: ch.code, address: w.address, publicKey: sig.publicKey, signature: sig.signature });
console.log('4. verify (happy path):', ok.status, JSON.stringify(ok.body));

const cookie = (ok.setCookie ?? '').split(';')[0];
const sess = await j(await fetch(B + '/api/auth/session', { headers: { cookie } }));
console.log('5. session cookie resolves to:', JSON.stringify(sess.body));

const replay = await post('/api/auth/verify', { code: ch.code, address: w.address, publicKey: sig.publicKey, signature: sig.signature });
console.log('6. replay same code:', replay.status, JSON.stringify(replay.body));

// The attack the address-derivation check exists to stop.
const { body: ch2 } = await post('/api/auth/challenge', { address: 'NQ83 4MVH 53Q4 AL3B Q097 55GJ LUQ3 GSF0 85B7' });
const { body: sig2 } = await post('/api/dev/wallet', { message: ch2.message });
const attack = await post('/api/auth/verify', { code: ch2.code, address: 'NQ83 4MVH 53Q4 AL3B Q097 55GJ LUQ3 GSF0 85B7', publicKey: sig2.publicKey, signature: sig2.signature });
console.log('7. IMPERSONATION (valid sig, someone else’s address):', attack.status, JSON.stringify(attack.body));

const tamper = await post('/api/auth/verify', { code: 'deadbeef'.repeat(4), address: w.address, publicKey: sig.publicKey, signature: sig.signature });
console.log('8. forged code:', tamper.status, JSON.stringify(tamper.body));
