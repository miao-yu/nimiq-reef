# Nimiq Grove

Mini App for the Nimiq Mini Apps Competition, Cycle II. Deadline **18 Sep 2026,
23:59 UTC**. Solo build.

A garden that grows from real staking activity. Read `docs/DECISIONS.md` before
proposing anything — especially the two guardrails, which are load-bearing:

1. Growth is paced by **time staked**, never by stake size.
2. Nothing in the grove ever converts back to NIM.

## Commands

```bash
npm run dev        # localhost:3000
npm run build
npm run typecheck
```

## Conventions

- `src/lib/grove` stays framework-free and deterministic — no React, no
  `Math.random()`. The server reuses it to render share images.
- Canvas colors come from CSS custom properties on `:root`, so themes need no
  JS palette table. Add new colors as tokens in `globals.css`, in all three
  theme states (bare `:root`, the `prefers-color-scheme` block, and
  `[data-theme]`).
- Secrets live in `.env.local`, never in source. The competition disqualifies
  hardcoded credentials.

## Do not copy from `../nimiq-pos-pool`

That repo has a database password in the git history of every tracked file, and
history travels with a fork or a copy. Reference its logic, retype what you
need. `../nimiq-cafe` is the better reference for wallet-signature auth — it
already uses `@nimiq/core` correctly.

## Related work in ~/Projects

- `nimiq-pos-pool` — the validator pool: reward accounting, 15-min batched payouts
- `nimiq-cafe` — Vite/React + Express + `@nimiq/core`, JWT wallet auth
- `core-rs-albatross` — Nimiq node source, for running a testnet node
