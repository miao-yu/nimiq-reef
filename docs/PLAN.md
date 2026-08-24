# Implementation plan

Solo build. 26 days: Mon 24 Aug → Fri 18 Sep 2026, 23:59 UTC.

**The real deadline is Mon 7 Sep.** Submissions go public at the start of week 3
for early-access testing, so that is when strangers first open this. The 11 days
after are polish and reacting to feedback, not construction.

## Sequencing principle

Do the things that can invalidate the design first. Three unknowns can each cost
days if they surface late:

1. HTTPS and a domain — Mini Apps will not load over plain HTTP, so **nothing
   can be tested on a phone until this exists**.
2. Which message encoding Nimiq Pay signs (`docs/RESEARCH.md`).
3. Whether the staking calls behave as their type signatures suggest.

All three are Phase 0. None of them are hard; all of them are fatal in week four.

---

## Phase 0 — De-risk · Mon 24 – Wed 26 Aug

Goal: a real phone, running the real app, over real HTTPS.

- [ ] Domain pointed at the VPS, nginx + TLS certificate
- [ ] Deploy the current scaffold (`node .next/standalone/server.js`)
- [ ] Harden per `docs/DEPLOY.local.md` — RPC on localhost, own system user,
      `grove` MySQL user with no grants on the pool
- [ ] Open it in Nimiq Pay via the **Custom URL** field (the nimpay.app deeplink
      is an allowlist and 404s for unlisted apps — see `docs/RESEARCH.md`)
- [ ] Sign in from the device; **read the `encoding` in the log and pin
      `signed-message.ts` to the winner**
- [ ] Fire one `sendNewStakerTransaction` on **testnet** — long-press settings
      for 10s to switch networks, then Get free NIM. Costs nothing.
- [ ] Sip & Ship call #1 (Wed 26 Aug) — showing up is scored

**Exit:** signing in from a phone works, and the verifier accepts exactly one
encoding.

**If this slips past Fri 28 Aug, stop and fix it before writing features.**

---

## Phase 1 — The loop · Thu 27 Aug – Tue 1 Sep

Goal: a garden that grows on its own from real staking data.

- [ ] Schema: `groves`, `plants`, `ticks`, `streaks`
- [ ] Grove state derived on read from `getStakerByAddress` + streak history —
      never a stored `growth` number that can drift from the chain
- [ ] Tick job every 15 minutes, matching the pool's cadence
- [ ] Free tier: a plot that grows without staking anything
- [ ] Planting: limited plots, permanent choices
- [ ] Species unlock from unbroken days staked — never from stake size

**Exit:** sign in, plant, come back after a tick, see it advanced.

The planting constraint is the fix for the Functionality score. A garden that
only grows by itself reads as a toy; one where choosing an elder tree costs you
three blooms is a game. It is a day of work and it is not optional.

---

## Phase 2 — Make it a product · Wed 2 – Mon 7 Sep

Goal: something a stranger can open and understand in sixty seconds.

- [ ] First-60-seconds flow: community grove alive **before** any wallet prompt
- [ ] Staking in-app: `sendNewStakerTransaction`, `sendStakeTransaction`
- [ ] Community grove, read-only
- [ ] Share image, server-rendered PNG from the same deterministic renderer
- [ ] `getHostLanguage()` for UI strings
- [ ] Empty, loading and error states everywhere
- [ ] Sip & Ship call #2 (Wed 2 Sep)

**Exit — Mon 7 Sep:** public, working, no dead ends. This is the date that
matters.

Build the share image in this phase, not later. Marketing is 25 points and a
screenshot people actually post is most of how you earn them.

---

## Phase 3 — Polish and react · Tue 8 – Mon 14 Sep

Goal: earn the Design points, and fix what real testers hit.

- [ ] Visual pass — the grove is the product, so this gets the most calendar time
- [ ] Webview QA on real devices: small screens, notch, slow network, dark mode
- [ ] Performance: canvas on a mid-range phone, not a laptop
- [ ] Act on early-access feedback
- [ ] Daily progress posts in the Skool community
- [ ] Sip & Ship call #3 (Wed 9 Sep)

**Exit:** nothing embarrassing on a cheap Android phone.

---

## Phase 4 — Submit · Tue 15 – Fri 18 Sep

- [ ] Description, max 250 words: what it does, who it is for, how it uses Nimiq Pay
- [ ] Demo video — optional, but it feeds the storytelling score
- [ ] README with screenshots and honest limitations
- [ ] Repo public, MIT, **scan the whole history for secrets before flipping it**
- [ ] Submit **Thu 17 Sep**, not on deadline day
- [ ] Sip & Ship call #4 (Wed 16 Sep)

---

## Where the 105 points come from

| Category | Pts | Earned by |
| --- | --- | --- |
| Design & UX | 25 | Phase 3, plus the Phase 2 onboarding flow |
| Functionality | 25 | Phase 1's real loop, and the planting constraint |
| Usefulness & originality | 25 | The concept — nothing ambient existed in Cycle 1 |
| Marketing & distribution | 25 | Share image, daily Skool posts, four calls, early-access week |
| Bonus | 5 | NIM staking is the core mechanic |

Marketing is a quarter of the score and the only category that cannot be
back-filled in the last week. Post progress daily from Phase 1 onward.

## Cut ladder

If behind, drop in this order and no other:

1. `getHostLanguage()` i18n
2. Community grove read-only view
3. Fourth species — ship three
4. Demo video

Never cut: the share image, the first-60-seconds flow, the visual pass, or the
planting choice. Those are load-bearing for 50 of the 105 points.

## Standing risks

| Risk | Mitigation |
| --- | --- |
| HTTPS slips | Phase 0, day one. Everything else waits on it |
| Signing encoding differs from both candidates | Phase 0 catches it while there is time to ask in the community |
| Canvas too slow on cheap phones | Test on real hardware in Phase 3, cap plant count |
| Solo illness or a bad week | The cut ladder exists so the answer is "ship less", not "ship late" |
| Secrets leak when the repo goes public | Fresh repo already; scan history in Phase 4 before flipping |
