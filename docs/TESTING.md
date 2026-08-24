# Testing

## Sign-in, end to end, without a phone

`/api/dev/wallet` holds a throwaway key and is 404 in production. The mock
provider signs through it, so local sign-in exercises the real verifier — same
signature check, same address derivation — rather than stubbing it out.

```bash
npm run dev
node scripts/auth-smoke.mjs      # against localhost:3000
```

Expected:

```
4. verify (happy path):        200  { address }
5. session cookie resolves to:      { address }
6. replay same code:           400  already used
7. impersonation attempt:      401  signature did not verify
8. forged code:                400  expired or used
```

Lines 6–8 are the ones that matter. If 7 ever returns 200, the address
derivation check has been broken and any wallet can claim any grove.

## Still needs a real device

- Which message encoding Nimiq Pay signs — see `docs/RESEARCH.md`.
- Every staking call. The mock deliberately throws on them.
- HTTPS. Mini Apps are not loadable over plain HTTP, so on-device testing is
  blocked until the certificate is in place.
