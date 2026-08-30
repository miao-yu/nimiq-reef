# Research log

Verified 23 Aug 2026 against published packages and the Albatross source, not
from memory. Re-check before relying on any of it.

## Versions in use

All current as of this date — `npm outdated` is empty.

| Package | Version | Note |
| --- | --- | --- |
| `next` | 16.3.2 | Appends its own block to `CLAUDE.md` on `next dev`; that file is gitignored |
| `react` | 19.2.8 | |
| `typescript` | 7.0.2 | The native compiler. Typechecks this project fine |
| `@nimiq/core` | 2.20.0 | older Nimiq projects pin ^2.0.5 — do not copy their pins |
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
request cannot. Reef is validator-neutral anyway, so always look up a single
staker by address.

## SETTLED: what bytes does Nimiq Pay sign?

`@nimiq/mini-app-sdk` forwards `sign()` to the host untouched — it adds no
prefix. Whether Nimiq Pay wraps the message (the Hub convention is
`\x16Nimiq Signed Message:\n` + length, hashed) is decided in native code we
cannot read.

**Answered on a real device, 24 Aug 2026.** A sign-in from Nimiq Pay logged
`encoding=hub-prefixed-sha256`, so the app frames messages exactly as the Hub
does:

```
SHA-256( "\x16Nimiq Signed Message:\n" + byteLength + message )
```

`signed-message.ts` is now pinned to that one framing and the raw-UTF-8
alternative is deleted — accepting more encodings than wallets produce only
widens what an attacker can feed the verifier. The dev wallet was updated to
frame the same way, so local runs still exercise the production path.

### HubApi picks the wrong endpoint on our domain

`new HubApi()` derives its endpoint from the page hostname and falls back to
`http://localhost:8080` for anything it does not recognise as a Nimiq domain.
`reef.nimiq.cafe` is not on that list, so Hub sign-in silently pointed at a dev
server. The endpoint is now pinned to `https://hub.nimiq.com`.

## Opening an unlisted Mini App on a device

Researched 24 Aug 2026, after `nimpay.app/miniapps/open/reef.nimiq.cafe`
returned "not in the directory".

**Use the Custom URL field.** In Nimiq Pay → Mini Apps there is a Custom URL
input; paste `https://reef.nimiq.cafe` and it loads. This is the documented
path for testing and needs no listing.
Source: https://nimiq.dev/mini-apps/development/load-local-mini-app

Why the deeplink failed: `nimpay.app/miniapps/open/<host>` is a **server-side
allowlist**, not a generic opener. It resolves only for hosts in the directory
feed at https://nimpay.app/api/miniapps. Confirmed by probe — listed apps
return 200, `reef.nimiq.cafe` returns 404 `Unknown mini app host`, and so does
a real Cycle 1 entry that was never listed. The overview page's claim that the
HTTPS link "works with any domain" is wrong.

The custom scheme `nimiqpay://miniapp?url=<encoded>` is handled by the app
rather than the server and warns-then-proceeds for unknown URLs. Not verified
on a device; the Custom URL field is the supported route.

### Directory listing is not required for the competition

Two separate pipelines, and the submit page says so outright:

- **Catalog listing** — https://nimpay.app/miniapps/submit, opens a PR against
  `nimiq/awesome`. Turnaround 1–3 days typically. Optional.
- **Competition entry** — https://miniappscompetition.com/submit, PR to
  `nimiq/miniappscompetition-submissions`, carrying a plain URL. No listing
  involved. Most Cycle 1 entries are still unlisted.

### Hidden dev menu, and free testnet NIM

Long-press the settings button in Nimiq Pay for ~10 seconds to reveal a network
switch: Default / Mainnet / Testnet. Switching clears transaction history and
reloads. On testnet the home screen offers **Get free NIM** — 110,000 testnet
NIM per tap.

This makes the Phase 0 staking test free: it can run on testnet rather than
costing 100 real NIM on mainnet. The switch affects Nimiq provider operations
only; EVM stays on mainnet.

Caveat: our server reads a **mainnet** node, so a testnet delegation will not
appear in a reef. That is fine for Phase 0, whose goal is only to prove the
SDK call works end to end from the app.
