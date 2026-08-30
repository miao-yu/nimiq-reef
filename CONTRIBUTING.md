# Contributing to Reef

Reef is a living aquarium that fills from real Nimiq staking. Read
`docs/DECISIONS.md` before proposing anything — especially the two guardrails,
which are load-bearing:

1. Growth is paced by **time staked**, never by stake size.
2. Nothing in the reef ever converts back to NIM.

## Shape

Fullstack Next.js on a single VPS. Server code talks to MySQL and a Nimiq node
directly over localhost (`src/lib/server/`). No separate API service.

Deployment hostnames and keys live outside the repo, in a gitignored local
note. **Never commit an IP, a hostname or a key.**

## Commands

```bash
npm run dev          # the app
npm run build
npm run typecheck    # runs with --incremental false, deliberately: see below
npm run migrate      # apply pending migrations

npm run check:tank   # the core loop, end to end
npm run check:feed   # feeding across two reefs
npm run check:stake  # transaction building and the relay's refusals
npm run check:fish   # ponds, the strike window, the hot pond's free cast
npm run check:peak   # a broken streak costs odds, never access
npm run check:streak # the staking streak, in isolation
npm run check:traits # rarity invariants
```

Most suites need a running dev server and reach it at `REEF_URL`
(default `http://127.0.0.1:3000`).

## Conventions

- `src/lib/reef` and `src/lib/tank` stay framework-free and deterministic — no
  React, no `Math.random()`. The server reuses them to render share images, and
  that is the only reason a shared card matches what the phone drew. Anything
  that needs live interaction is passed in as a parameter the server omits.
- **Never call `getStakersByValidatorAddress`** from a request; the node source
  marks it extremely expensive. Use `getStakerByAddress`.
- Rules that matter go in **database constraints**, not in application code that
  can lose a race to a double tap. One feed per wallet per day and one free cast
  per epoch are both unique keys, not `if` statements.
- Canvas colours come from CSS custom properties on `:root`, so themes need no
  JS palette table. Add new colours as tokens in `globals.css`, in all three
  theme states: bare `:root`, the `prefers-color-scheme` block, and
  `[data-theme]`.
- Secrets live in `.env.local`, never in source.

## Verify before you trust

`docs/RESEARCH.md` records what was checked against real packages and the
Albatross source, with dates. Three rules came out of experience rather than
theory:

- **The sign-in check has two halves**: verify the signature *and* that the
  public key derives to the claimed address. Dropping the second lets any wallet
  claim any reef. `scripts/auth-smoke.mjs` case 7 guards this.
- **Test progression changes through the API, not the function.** A unit test on
  the trait function once passed while the pipeline substituted a default tier
  on the way out. `check:peak` asserts against `/api/reef` for that reason.
- **`typecheck` runs with `--incremental false`.** A stale cache once reported a
  clean pass while a component read a property that had been deleted.

## The renderer is deterministic, and that is load-bearing

A creature's position is a pure function of its seed and the frame time. The
server draws share cards with the same code the browser uses, so a card is the
picture the player was looking at. Two consequences:

- Stateful motion (flocking, steering) cannot go in `placeAt`.
- Anything interactive — a finger on the glass — is an optional parameter that
  only the client passes.
