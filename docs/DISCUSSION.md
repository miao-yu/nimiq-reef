# Open discussions

Design questions that are not settled. Each one records what the code does
*today* — verified, not remembered — before proposing anything, because most of
these went unnoticed precisely because the intent and the implementation had
quietly drifted apart.

Settled things move to `DECISIONS.md`. Nothing here is scheduled.

---

## 1. Onboarding: three audiences, one served

### What happens today

`src/lib/nimiq/provider.ts` picks a signer: Nimiq Pay if the Mini App host
injected one, otherwise the Nimiq Wallet Hub, otherwise (dev only) a mock.
That covers *signing in*. Staking is where the three audiences separate.

| Who | Sign in | Stake from inside Reef |
| --- | --- | --- |
| Has Nimiq Pay | yes | **yes** — `sendNewStakerTransaction` / `sendStakeTransaction` |
| Has a Nimiq wallet, in a browser | yes, via `chooseAddress` | **no** — throws `BROWSER_STAKING_UNAVAILABLE` |
| No Nimiq account at all | **no** — dead end | no |

The third row is the one that matters for growth and nothing in the app
addresses it. `chooseAddress()` assumes an account already exists; a newcomer
opens the Hub popup and finds nothing to choose.

The second row matters for the competition specifically: a judge opening the
submission link on a laptop lands on exactly the path where staking is refused.

### A zero-stake account is already playable, and we never say so

Worth stating because it changes what onboarding has to achieve. Measured:

    0 NIM staked  →  3 slots, depth 0.42
    0 days staked →  2 species unlocked, weights {common 92, uncommon 8}

Charges accrue on the epoch (`chargesFrom`) with no stake gate, and
`/api/roll` never reads `stakedLuna`. So somebody with an empty wallet can sign
in, hold three charges, roll, discover, and feed on day one. The tank is small
and the odds are flat — which is exactly the right shape for a demo — but the
UI presents this state as a deficiency rather than as the free trial it is.

### Options

**(a) `hub.onboard()` for the newcomer.** Verified present in
`@nimiq/hub-api` 1.14.0: `onboard(request): Promise<Account[]>` — the Hub's own
create / login / import flow. The signed-out screen becomes two doors instead of
one button: *I have a Nimiq wallet* → `chooseAddress`, *I'm new here* →
`onboard`. One call, dependency already installed. It does not hand them any
NIM, but it does end the dead end, and the paragraph above is why that is
enough to start.

**(b) One-click staking in the browser — cheaper than the code comment claims.**
`src/lib/nimiq/hub.ts` currently says browser staking would mean shipping
`@nimiq/core`'s WASM to a mobile-first bundle. That reasoning is wrong: it
assumes the transaction has to be *built* in the browser. `signStaking` takes
`transaction: Uint8Array | Uint8Array[]` — bytes from anywhere. So:

    POST /api/stake/build   server builds it with @nimiq/core (Node build,
                            already in serverExternalPackages, 0 browser bytes)
    hub.signStaking(bytes)  the Hub shows the user what they are signing
    POST /api/stake/send    we broadcast through our own RPC node

No new dependency, no WASM in the client, roughly two endpoints. The return
type is `SignedTransaction[]` because a first-time staker needs both a
create-staker and a stake transaction — the array is the tell. Estimated half a
day, and it closes the judge-on-a-laptop hole.

**(c) Deep-link to Nimiq Pay instead of apologising.** `/open` already exists.
The `BROWSER_STAKING_UNAVAILABLE` branch currently renders a sentence; it could
render a QR code that opens this reef inside Nimiq Pay, where everything already
works. Half an hour, and it is the highest UX gain per minute available here.

**(d) Fiat on-ramp.** Out of scope. Nimiq Pay has one; we point at it.

### Leaning

(c), then (a), then (b) if there is time before 7 Sep. (b) is the one with a
competition argument behind it rather than a user argument, which is why it is
not first.

The copy change is free and should happen regardless: the zero-stake state
should read as *"Your reef is as small as it gets. Staking makes room and
better species."* — not as an error.

---

## 2. Feeding: a button attached to nothing

### What happens today

This is the finding. Traced through the code rather than assumed:

- `POST /api/feed` → `feedOwn()` → `INSERT IGNORE INTO feeds`. That is the
  entire effect. No other table, no state change.
- `feedStreak` is computed in `reef-state.ts` and rendered once, at
  `src/app/page.tsx:121`, as a bare number.
- `receivedToday` is rendered once, as "fed by N".
- Rolls are gated on **charges** (epoch). Rarity is weighted by **days staked**.

Neither of those two mechanics reads a feed value. Feeding increments a counter
that nothing consumes. The system meant to carry daily retention is, mechanically,
inert.

How it got that way is defensible: the three-axis model deliberately kept money
and time as the only inputs to rarity, so *a wallet cannot buy better odds*, and
feeding had nowhere to land without denting that rule.

### Where feeding can land without denting the rule

The rule is that **money** must not buy odds. Attendance already buys
opportunity — that is what charges are. So feeding may legitimately affect
*when* and *how visible*, and may affect rarity only through attendance.

1. **Feeding gates the day's first roll.** One condition, makes the loop real:
   open, feed, roll. Rejected — it converts a missed day into forfeited charges,
   and "nothing dies from a missed feed" is a standing guardrail.

2. **Feed streak nudges the rarity band, hard-capped.** A 7-day streak shifts
   `tierWeights` by the equivalent of a few days staked, capped low (≈ +30 days).
   Money still buys nothing. Makes the streak number on the page mean something.
   Medium risk: it is a second time-axis competing with the first.

3. **Being fed is visible in the tank.** Today it is a line of text. Each
   feeding received could add drifting food and a brief surface-ward school.
   Zero balance risk, no schema change, and it is the thing that makes opening
   the app feel like somebody was there. Cheap.

4. **A feed received grants a charge, capped at one a day.** The strongest
   social pull available: somebody else's action gives you a roll. Farm risk is
   bounded by the existing device gate — `feedings` already allows one give per
   device per UTC day.

Leaning: **3 and 4**. Skip 1. Hold 2 until after the competition.

### Surfacing other reefs — the actual gap

`/api/feed/candidates` returns three handles and up to six species *names*. No
picture. Inside Nimiq Pay only. There is no browse, no lookup, no way to see the
reef you just fed, and no way to feed a specific friend.

What is missing, cheapest first:

- **Render the candidates.** `/api/share` plus `@napi-rs/canvas` already render
  a tank server-side. A handle-keyed `GET /api/reef/{handle}/card.png` would
  turn three names into three actual aquariums. Biggest single upgrade to
  feeding, and it reuses code that exists.
- **A public reef page, `/r/{handle}`.** Read-only tank, species list, a feed
  button. It also happens to be the answer to the site having exactly two
  indexable pages — every reef becomes a real page with a real title.
- **Lookup by handle**, so you can feed a friend who told you theirs.
- **"Who fed you"** — store the giver's handle so the line reads *"Coral Drift
  fed you"* instead of *"fed by 1"*. A number is a statistic; a name is a
  relationship. Handles only. **Never addresses** — that rule is already load
  bearing in `candidates/route.ts` and must survive all of this.

### Two things to decide before building any of that

**The Nimiq Pay gate on giving.** Giving requires `requestDeviceIdentifier()`,
so a browser user cannot feed anyone. The anti-farm reasoning is sound — a
wallet is free, a device is not. But it means the social half of the app is dark
for everyone who is not on a phone, judges included. Worth asking whether
browser users should be allowed to feed *reefs they reached by handle* (not the
server's candidate list), rate-limited on session address, given that what is
being farmed is a cosmetic and at most one charge.

**Public reef pages leak a little.** A crawlable `/r/{handle}` makes the
handle → contents mapping public. Addresses stay private, but a friend who knows
your handle can infer roughly how long you have staked. That is probably fine
and probably should still be opt-out.
