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
| Hosting | Next on Vercel, engine on the pool server | See ARCHITECTURE.md |
| Validators | **Any validator** — ecosystem-neutral | Bigger audience, other operators promote it, and it does not read as a funnel to our own pool |
| Team | Solo | Scope stays tight |
| Renderer | Canvas, deterministic, framework-free | Same code draws the server-side share image |

## Guardrails

These are not style preferences. Breaking either one changes what this app is.

**1. Pace growth on time, never on stake size.**
Species unlock from unbroken days staked. A wallet with 100 NIM and one with
100,000 NIM grow the same garden; the difference is what lands in their wallet.
Scaling growth with stake makes it pay-to-win, lets a whale flatten the grove on
day one, and makes the app read as an investment product.

**2. Nothing in the grove ever converts back to NIM.**
Plants are status, memory, decoration. No trading, no gifting, no marketplace,
no cash-out. The moment a rare species has a price, this is a yield farm in a
costume — which judges see through and regulators care about. Real NIM stays
real and withdrawable at the staking contract.

## Scope

**In v1**
- One grove per wallet, four species
- Real 15-minute tick driven by the node
- Limited plots, so planting is a permanent choice
- Read-only community grove
- Share as a rendered image
- Free tier that grows without staking anything

**Cut, deliberately**
- Trading or gifting plants, any marketplace
- Live multiplayer state
- Seasons, weather, more than four species
- Anything that converts to NIM

Idle games die of too many systems long before too few.

## Open

- **Can we test inside Nimiq Pay?** Needs the app installed with a wallet. A
  mock provider is being built regardless — developing against a phone for every
  change is not workable — but the real thing has to be verified before submission.
- **Testnet or mainnet for development?** `core-rs-albatross` is already cloned;
  a testnet node avoids risking real NIM during the build.
- **Domain** for the Mini App URL.
- **Does unstaking kill the grove?** Brutal drives retention; forgiving avoids
  punishing someone who simply needs their money back. Leaning forgiving —
  growth pauses, nothing dies.
- **What the plants actually are.** Botanical is the obvious read. A reef or a
  night sky would work too. Pick whatever renders beautifully with no illustrator.
