# Architecture

One VPS. One Next.js app. The node and MySQL are on localhost.

```
  Nimiq Pay (phone)
        │  https
        ▼
  ┌─────────────────────────────────────────────┐
  │  the VPS                                    │
  │                                             │
  │   nginx :443  ──►  Next.js :3000            │
  │                      │        │             │
  │                      │        └── tick job, every 15 min
  │                      ▼                      │
  │        MySQL `grove`     Nimiq node :8648   │
  │        (own user)        (localhost only)   │
  └─────────────────────────────────────────────┘
```

Server code reaches both directly — `src/lib/server/db.ts` and
`src/lib/server/rpc.ts`. No internal API, no shared secret, no second deploy.

## What v1 gives up

The earlier plan split the app across Vercel and a private engine so the web
tier held no credentials. This is simpler and one deploy, at the cost of the app
sharing a machine with a live validator. Mitigations live in
`docs/DEPLOY.local.md` and are not optional: RPC bound to localhost, a separate
unprivileged system user, a `grove` database user with no grants on the pool's
tables, nginx terminating TLS.

Revisit if the grove ever holds anything worth stealing. Today it holds
plant positions.

## Sign-in

No accounts, no passwords. The player proves wallet control with a signature.

1. App asks for a challenge.
2. Server returns a nonce bound to the claimed address, valid ~5 minutes.
3. App calls `nimiq.sign(nonce)`; the user approves in Nimiq Pay.
4. Nimiq Pay returns `{ publicKey, signature }`.
5. Server verifies **both halves** with `@nimiq/core`:
   - the signature is valid for that public key, **and**
   - the address derived from that public key equals the claimed address.
6. Session cookie issued.

Step 5's second check is not optional. Verifying only the signature lets anyone
sign a nonce with their own key, claim someone else's address, and inherit that
grove. `../nimiq-cafe` already does this correctly — reuse that code.

## The tick

`payout.ts` in `nimiq-pos-pool` already runs a batched job every 15 minutes on
this same box. The grove tick uses the same cadence and the same source of truth:

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
