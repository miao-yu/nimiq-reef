# Architecture

Two boxes, one rule: **Vercel holds no database credentials and no chain access.**

```
  Nimiq Pay (phone)
        │  loads the Mini App over https
        ▼
  Next.js on Vercel  ──── server-side fetch, shared secret ────┐
  UI + session cookies                                          │
  Never sees the DB or the node                                 ▼
                                              Grove engine (pool server)
                                              ├── Nimiq node, JSON-RPC :8648
                                              ├── MySQL — groves, plants, ticks
                                              └── tick worker, every 15 min
```

## Why the split

A public web app on the same machine as a live validator is a real slashing and
key-exposure risk. The engine stays private on the pool server; Vercel is a
thin front-end and BFF that proxies to it with a shared secret. The browser
never talks to the engine, and `GROVE_API_SECRET` never reaches client code.

## Sign-in

No accounts, no passwords. The player proves wallet control with a signature.

1. App asks the engine for a challenge.
2. Engine returns a nonce bound to the claimed address, valid ~5 minutes.
3. App calls `nimiq.sign(nonce)`; the user approves in Nimiq Pay.
4. Nimiq Pay returns `{ publicKey, signature }`.
5. Engine verifies **both halves** with `@nimiq/core`:
   - the signature is valid for that public key, **and**
   - the address derived from that public key equals the claimed address.
6. Session issued.

Step 5's second check is not optional. Verifying only the signature lets anyone
sign a nonce with their own key, claim someone else's address, and inherit that
grove. `nimiq-cafe` already does this correctly — reuse that code.

## The tick

`payout.ts` in `nimiq-pos-pool` already runs a batched job every 15 minutes.
The grove tick is the same cadence and the same source of truth:

- `getStakerByAddress` → stake size → plot width
- unbroken days staked → which species are unlocked
- accumulated rewards → canopy fullness

Growth is derived from these on read. Do not store a separate "growth" number
that can drift from the chain.

## Renderer

`src/lib/grove` is pure TypeScript with no React and no DOM beyond a canvas
context, and it is deterministic — every plant carries a seed, and the renderer
never calls `Math.random()`. That is what lets the server draw the exact same
grove for a share image that the phone drew for the player.
