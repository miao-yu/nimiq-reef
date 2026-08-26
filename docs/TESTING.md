# Testing

Three suites. All must pass before a deploy.

```bash
npm run typecheck
npm run check:progression     # pure maths, no server
npm run dev                   # then, in another shell:
node scripts/auth-smoke.mjs
node scripts/tank-smoke.mjs
```

## Sign-in — `scripts/auth-smoke.mjs`

`/api/dev/wallet` holds a throwaway key and is 404 in production. The mock
provider signs through it, so local sign-in exercises the real verifier — same
signature check, same address derivation — instead of stubbing it out.

```
6. replay same code:            400  already used
7. IMPERSONATION attempt:       401  signature did not verify
8. forged code:                 400  expired or used
```

**Case 7 is the one that matters.** A foreign key passes the signature check on
its own; only deriving the address from the public key catches it. If that ever
returns 200, any wallet can claim any reef.

## The loop — `scripts/tank-smoke.mjs`

Eighteen checks over the rules that *are* the game:

- three rolls succeed and **the fourth is refused** — the charge cap
- every roll produced a specimen — there is never an empty outcome
- a released specimen **survives in the guide** and leaves the tank
- feeding twice in a day is idempotent, not an error
- giving without a device id is refused, and refused again without a session
- every authenticated route returns 401 without one

The dev wallet rotates per run (`?fresh=1`), so a second run is not poisoned by
the charges the first one spent. Without that, a rerun fails for reasons
unrelated to the code.

## Progression — `npm run check:progression`

27,000 rolls across the ladder, plus the invariants:

- every roll yields a valid, already-unlocked species
- legendary odds rise with days and **cap at 9% even at day 100,000** — the
  curve approaches a ceiling it never reaches, so nothing ever tops out
- `tierWeights` takes days and nothing else, which makes "stake never buys
  better odds" a test rather than a comment

## Still needs a real device

- Every staking call — the mock deliberately throws on them.
- `requestDeviceIdentifier()`, and therefore feeding a stranger. It is
  unavailable outside Nimiq Pay by design, so the smoke test can only assert
  that giving is *refused* without it.
