# Reef

Mini App for the Nimiq Mini Apps Competition, Cycle II. Formerly Reef;
the garden became an aquarium. Deadline **18 Sep 2026,
23:59 UTC**. Solo build.

A garden that grows from real staking activity. Read `docs/DECISIONS.md` before
proposing anything — especially the two guardrails, which are load-bearing:

1. Growth is paced by **time staked**, never by stake size.
2. Nothing in the reef ever converts back to NIM.

The date that matters is **Mon 7 Sep**, when entries go public for early-access
testing — not the 18th.

## Shape

Fullstack Next.js on a single VPS. Server code talks to MySQL and the Nimiq
node directly over localhost (`src/lib/server/`). No separate API service.
Prod hostnames live in `docs/DEPLOY.local.md`, which is gitignored — **this
repo goes public**, so never commit an IP, hostname or key.

## Commands

```bash
npm run dev        # localhost:3000
npm run build
npm run typecheck
node scripts/auth-smoke.mjs   # sign-in, replay and impersonation checks
```

## Conventions

- `src/lib/reef` stays framework-free and deterministic — no React, no
  `Math.random()`. The server reuses it to render share images, and that is the
  only reason a shared card matches what the phone drew.
- **Never call `getStakersByValidatorAddress`** from a request; the node source
  marks it extremely expensive. Use `getStakerByAddress`.
- Rules that matter go in **database constraints**, not in application code that
  can lose a race to a double tap.
- Canvas colors come from CSS custom properties on `:root`, so themes need no
  JS palette table. Add new colors as tokens in `globals.css`, in all three
  theme states (bare `:root`, the `prefers-color-scheme` block, and
  `[data-theme]`).
- Secrets live in `.env.local`, never in source. The competition disqualifies
  hardcoded credentials.

## Verify before you trust

`docs/RESEARCH.md` records what was checked against real packages and the
Albatross source, with dates. Two rules that came out of it:

- **Never call `getStakersByValidatorAddress` from a request** — the node marks
  it extremely expensive. Look up one staker by address.
- **The sign-in check has two halves**: verify the signature *and* that the
  public key derives to the claimed address. Dropping the second lets any
  wallet claim any reef. `scripts/auth-smoke.mjs` case 7 guards this.

## Do not copy from the older sibling projects

Any Nimiq code sitting next to this one is out of date — `nimiq-cafe` pins
`@nimiq/core` ^2.0.5 against a current 2.20.0, and the rest carry history that
should not be dragged into a fresh tree. Read them for intent; write fresh code
against `docs/RESEARCH.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
