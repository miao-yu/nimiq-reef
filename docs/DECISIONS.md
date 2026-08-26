# Decisions

## Fixed by the competition

Read from miniappscompetition.com on 23 Aug 2026.

- Cycle II runs 24 Aug – 18 Sep 2026. Submissions close **18 Sep, 23:59 UTC**.
- Public GitHub repo, **MIT licensed**, **no hardcoded credentials**.
- Must be built on the Nimiq Pay Mini Apps Framework and integrate NIM or USDT
  as a core part of the experience. NIM support earns bonus points; showing a
  logo does not count as integration.
- Must be fully functional on first use. No prototypes.
- **Gambling and games of chance are banned outright** — a disqualification,
  not a deduction. Nothing here involves a wager or a random outcome.
- Scored out of 105: Design/UX 25, Functionality 25, Usefulness/Originality 25,
  Marketing/Distribution 25, Bonus 5.
- Submissions go public at the start of week 3 for early testing.

## Chosen

| Decision | Choice | Why |
| --- | --- | --- |
| Stack | Next.js 16 + React 19, hand-rolled | No starter template; small surface, few screens |
| Hosting | Fullstack Next.js on one VPS, alongside the node and MySQL | v1 simplicity: one deploy, no internal API. See ARCHITECTURE.md |
| Validators | **Any validator** — ecosystem-neutral | Bigger audience, other operators promote it, and it does not read as a funnel to our own pool |
| Team | Solo | Scope stays tight |
| Renderer | Canvas, deterministic, framework-free | Same code draws the server-side share image |

## Guardrails

These are not style preferences. Breaking either one changes what this app is.

**1. Pace growth on time, never on stake size.**
Species unlock from unbroken days staked. A wallet with 100 NIM and one with
100,000 NIM grow the same garden; the difference is what lands in their wallet.
Scaling growth with stake makes it pay-to-win, lets a whale flatten the reef on
day one, and makes the app read as an investment product.

**2. Nothing in the reef ever converts back to NIM.**
Plants are status, memory, decoration. No trading, no gifting, no marketplace,
no cash-out. The moment a rare species has a price, this is a yield farm in a
costume — which judges see through and regulators care about. Real NIM stays
real and withdrawable at the staking contract.

## Scope

**In v1**
- One reef per wallet, four species
- Real 15-minute tick driven by the node
- Limited plots, so planting is a permanent choice
- Read-only community reef
- Share as a rendered image
- Free tier that grows without staking anything

**Cut, deliberately**
- Trading or gifting plants, any marketplace
- Live multiplayer state
- Seasons, weather, more than four species
- Anything that converts to NIM

Idle games die of too many systems long before too few.

## Verified, not assumed

See `docs/RESEARCH.md`. Everything below was checked against published packages
and the Albatross v1.7.2 source on 23 Aug 2026, because the older Nimiq projects
in `~/Projects` are out of date.

## Open

Everything that was listed here has since been settled — Nimiq Pay testing,
mainnet, the signing encoding, the domain, forgiving unstaking, and what the
inhabitants are. Live design questions now live in `docs/DISCUSSION.md`:
onboarding for users who are not yet in Nimiq, and what feeding actually does.
