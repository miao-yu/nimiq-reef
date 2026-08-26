# Nimiq Reef

A garden that grows from real staking activity, built as a Mini App for
[Nimiq Pay](https://nimiq.dev/mini-apps). Your stake is soil, each payout tick
is a watering, and species unlock from days survived. Nothing is simulated —
every visual is a value the chain already reports.

Entry for the Nimiq Mini Apps Competition, Cycle II (24 Aug – 18 Sep 2026).

## Quickstart

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run typecheck
```

Copy `.env.example` to `.env.local` and fill it in. The app expects a Nimiq
node and MySQL on localhost; see `docs/ARCHITECTURE.md`.

## Layout

```
src/
  app/              Next.js App Router
  components/       React components (Reef canvas)
  lib/reef/        Renderer — pure, no React, no DOM beyond canvas
  lib/server/       Node RPC, MySQL pool, env (server-only)
docs/
  DECISIONS.md      What was decided and why, plus what is still open
  ARCHITECTURE.md   How Vercel, the engine, and the node fit together
```

The renderer in `src/lib/reef` is deliberately framework-free and
deterministic, so the same code can draw a share image server-side.

## License

MIT — required by the competition rules, and the right call anyway.
