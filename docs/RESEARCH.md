# Research log

Verified 23 Aug 2026 against published packages and the Albatross source, not
from memory. Re-check before relying on any of it.

## Versions in use

All current as of this date — `npm outdated` is empty.

| Package | Version | Note |
| --- | --- | --- |
| `next` | 16.3.2 | Appends its own block to `CLAUDE.md` on `next dev`; committed so the tree stays clean |
| `react` | 19.2.8 | |
| `typescript` | 7.0.2 | The native compiler. Typechecks this project fine |
| `@nimiq/core` | 2.20.0 | `nimiq-cafe` pinned ^2.0.5 — badly out of date |
| `@nimiq/mini-app-sdk` | 0.1.0 | Only release; the whole SDK is ~200 lines of forwarding |
| `@nimiq/utils` | 0.12.4 | `validation-utils`, `albatross-policy`, `rewards-calculator` |
| `jose` | 6.2.10 | Session JWTs |

## @nimiq/core works standalone in Node

The `node` export resolves to `./nodejs/index.mjs` and exposes the crypto
classes with no client, no network and no explicit WASM init. Verified by round
trip:

```
PublicKey.fromHex(hex) → .verify(Signature.fromHex(sig), bytes) → boolean
PublicKey.fromHex(hex) → .toAddress().toUserFriendlyAddress() → string
```

That is the entire server-side sign-in requirement. Needs
`serverExternalPackages: ['@nimiq/core']` so Next does not try to bundle the WASM.

## Why the sign-in check has two halves

Demonstrated, not assumed. An attacker signing the challenge with their own key:

```
signature valid: true          ← passes the signature check alone
address derives to claim: false ← only the derivation check catches it
```

Checking the signature without deriving the address lets anyone claim any
address. `src/lib/server/auth.ts` does both; the integration test in
`docs/TESTING.md` covers it.

## Epoch timing — measured, not guessed

```
Policy.BLOCKS_PER_EPOCH      = 43200
Policy.BLOCK_SEPARATION_TIME = 1000n  (ms)
→ one epoch = 43,200 s = 12 hours
```

So an epoch is a poor tick for a garden. The 15-minute payout cadence the pool
already runs is the right granularity; epochs matter for reward accounting.

## Staker shape — from source, not docs

`core-rs-albatross` v1.7.2, `rpc-interface/src/types.rs:932`, serialized
`camelCase`:

```
address, balance, delegation (nullable), inactiveBalance,
inactiveFrom (nullable block number), retiredBalance
```

`inactiveFrom` was missing from the first draft. It is how you detect that
someone has begun unwinding — which the streak logic depends on.

## Never call getStakersByValidatorAddress from a request

`rpc-interface/src/blockchain.rs:170-172` marks it "extremely computationally
expensive" — it walks every staker in the staking contract. Same warning on
`getValidators` and `getAccounts`. The pool can afford it once per epoch; a web
request cannot. Grove is validator-neutral anyway, so always look up a single
staker by address.

## Open: what bytes does Nimiq Pay sign?

`@nimiq/mini-app-sdk` forwards `sign()` to the host untouched — it adds no
prefix. Whether Nimiq Pay wraps the message (the Hub convention is
`\x16Nimiq Signed Message:\n` + length, hashed) is decided in native code we
cannot read.

`src/lib/server/signed-message.ts` therefore tries both and logs which matched.
**On the first successful sign-in from a real phone, read the `encoding` in the
log and delete the other candidate.** A dev-wallet log saying `raw-utf8` proves
nothing — the mock chose that itself.
