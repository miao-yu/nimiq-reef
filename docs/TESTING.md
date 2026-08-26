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
derivation check has been broken and any wallet can claim any reef.

## Planting rules

```bash
npm run dev
node scripts/reef-smoke.mjs
```

Cases 3, 5 and 6 are the whole game:

```
3. plant a locked species:      403
5. plant over an existing one:  409   <- planting is permanent
6. plant in an uncleared plot:  403
7. plant with no session:       401
```

If 5 ever returns 200, planting has stopped being a decision and the reef is
a toy again. The permanence is enforced by UNIQUE (address, plot_index), so it
holds even when two taps race.

`chainOffline: true` locally is correct — there is no Nimiq node on a laptop,
and the state falls back to recorded history instead of reporting an empty
stake.

## Still needs a real device

- Every staking call. The mock deliberately throws on them.
- HTTPS. Mini Apps are not loadable over plain HTTP, so on-device testing is
  blocked until the certificate is in place.
