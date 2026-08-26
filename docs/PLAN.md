# Implementation plan — Reef

**This document is the handoff.** It assumes no memory of the conversation that
produced it. Read it, then `docs/SPEC-tank.md` (the aquarium spec), then start at Step 1.

Deadline: **Fri 18 Sep 2026, 23:59 UTC**. The date that actually matters is
**Mon 7 Sep**, when all entries go public for early-access testing — that is
when strangers, and probably council members, first open this. Written 25 Aug.

---

## 0. What already exists and works

Deployed at https://reef.nimiq.cafe, running as `grove.service` on the VPS
(the unit and paths still say `grove`; only the public hostname moved).
Do not rebuild any of this.

| Working | Where |
| --- | --- |
| Wallet sign-in, both halves verified | `src/lib/server/auth.ts`, `src/app/api/auth/*` |
| Session cookies (jose JWT) | `src/lib/server/session.ts` |
| Nimiq Pay + Hub + dev-mock providers | `src/lib/nimiq/provider.ts` |
| Albatross RPC client | `src/lib/server/rpc.ts` |
| 15-minute tick on a systemd timer | `src/app/api/tick/route.ts`, `deploy/grove-tick.*` |
| Schema + forward-only migrations | `migrations/`, `scripts/migrate.mjs` |
| Deterministic canvas renderer | `src/lib/grove/render.ts` |
| Server-side share PNG (`@napi-rs/canvas`) | `src/lib/server/share-image.ts` |
| Staking from in-app, neutral validator picker | `src/components/StakePanel.tsx` |
| i18n en/de/es off `getHostLanguage()` | `src/lib/i18n/` |
| Client error reporting (no console on a phone) | `src/lib/client-log.ts` |
| Deploy script, builds on the box | `deploy/deploy.sh` |

Run it: `GROVE_SSH=root@<host> ./deploy/deploy.sh` (host is in
`docs/DEPLOY.local.md`, which is gitignored — **this repo goes public**).

---

## 1. The decision this plan implements

**Switch from a garden to an aquarium.** Plants do not move; fish do. For an
ambient app whose whole proposition is "worth opening to look at", that is the
difference between boring and not.

The mechanics are decided. Do not redesign them; if something seems wrong,
raise it rather than quietly changing it.

### Three axes, three sources

| Axis | Source | Governs |
| --- | --- | --- |
| **Money** | stake amount | the vessel: tank size, depth, and **how many specimens you can display** |
| **Time** | unbroken days staked | the **rarity distribution** of every roll |
| **Attendance** | interaction charges | **when a roll happens** |

The slogan, which is also the test for any new feature:
**Attendance creates opportunity. Loyalty creates possibility. Money creates room.**

### Charges

- Maximum **3** charges. One regenerates every **8 hours**.
- Empty to full is 24 hours. Somebody who opens the app once a day gets three
  rolls; somebody who opens it every eight hours gets three rolls.
  **Checking more often must never yield more.** That property is what makes a
  bot worthless and the app restful.
- A **distinct-counterparty payment** in Nimiq Pay also grants a charge, capped
  the same way. Count distinct counterparties, never raw transactions —
  Nimiq fees are near zero so self-sends are free and infinitely farmable.
- **No diminishing-returns tier beyond the cap.** It was considered and
  rejected: telling a committed player that the twentieth click is still worth
  *something* reopens the grind through the side door.

### Rarity curve — asymptotic, never topping out

Rolled at the moment a charge is spent.

Nimiq proof-of-stake has been live over eighteen months and staking is measured
in years, so the curve has to last years. **There must be no "maxed out"
moment** — that is what kills collection games.

Anchors, with **linear interpolation between them** and the last row held
beyond 730 days:

| Days in Reef | Common | Uncommon | Rare | Legendary |
| --- | --- | --- | --- | --- |
| 0 | 92% | 8% | — | — |
| 7 | 80% | 17% | 3% | — |
| 30 | 66% | 24% | 9% | 1% |
| 90 | 55% | 28% | 14% | 3% |
| 365 | 44% | 30% | 20% | 6% |
| 730 | 38% | 30% | 23% | 9% |

It approaches a ceiling it never reaches, so a two-year staker is meaningfully
luckier than a three-month staker **forever**.

**Every roll produces a specimen.** There is never an empty result. See §2.

### Days are counted in Reef, and the app says so

We cannot read anyone's real staking history. Verified 25 Aug on the production
node: `getTransactionsByAddress` returns *"Method requires a history index"*,
and the `Staker` struct carries no "staking since" field — only current
balances and `inactiveFrom`. Enabling a history index means a full resync of
the entire chain history, which is not something to do to a live validator.

So **day 1 is the day you join Reef**, uniformly, and the copy states it plainly
rather than implying we know more than we do. A long-standing staker is not
disadvantaged in any real sense: they are already staking, so they never break
their streak and they climb without effort.

### Species ladder — years, not weeks

| Species | Unlocks at | Tier |
| --- | --- | --- |
| water grass, guppy | day 0 | Common |
| angelfish | 2 | Uncommon |
| jellyfish | 5 | Rare |
| cleaner shrimp | 10 | Uncommon |
| **shark** | **14** | Apex |
| lionfish | 30 | Rare |
| ray | 60 | Rare |
| octopus | 120 | Apex |
| turtle | 240 | Apex |
| **whale** | **365** | Legendary |
| abyssal species | 730 | Legendary |

Two deliberate choices. The **shark stays reachable inside the competition**, so
the app can be seen near its best during judging. The **whale moves to a full
year** — which makes it a far better trophy than a twelve-day unlock. Someone
swimming a whale has genuinely been here a year, and that is what people
screenshot.

**Ship only as far down this ladder as you can build well.** Everything below
the last shipped species still appears in the field guide as a locked
silhouette with its unlock day, which is how a collection game creates
anticipation without spending the content.

### Discovery versus display

Three rolls a day for thirty days is ninety fish, which is a soup, not a tank.

- **The field guide records everything you have ever discovered, permanently.**
- **The tank displays a limited number**, and the limit comes from stake size.
- Returning a fish to the reef removes it from display, never from the guide.

Discovery is unlimited, display is scarce, and curating is the best decision in
the game. This is also what makes a whale's large tank meaningful without
touching their odds.

---

## 2. Guardrails — do not break these

Every one of these was a deliberate decision with a reason. Changing one is a
product decision, not an implementation detail.

1. **Amount must never affect rarity odds.** Paying for better odds is a loot
   box with a price tag — that is the competition's gambling rule, which is a
   disqualification and not a deduction.
2. **Nothing converts to NIM.** No trading, gifting, selling, or cashing out of
   specimens. The moment rarity has a price this is a yield farm in a costume.
3. **No leaderboard ranked by rarity or by stake size.** Rarity conferring
   chaseable status recreates the prize element. Any ranking ranks *care* —
   summed feeding streaks, share of tanks fed today.
4. **Every roll yields a specimen.** Never an empty outcome. The difference
   between "I opened a box and got junk" and "I found something, and today it
   was ordinary" is framing, and the second is both safer and better writing.
5. **Language is discovery, not opening.** "A rare angelfish has appeared,"
   never "you won". Keeps the vocabulary clear of a casino.
6. **No referral pyramid.** Single level and cosmetic if ever.
7. **Growth is derived on read, never stored.** A stored growth number drifts
   away from the chain.
8. **Never call `getStakersByValidatorAddress`** from a request. The node source
   marks it extremely expensive — it walks the whole staking contract. Use
   `getStakerByAddress`, a single lookup.
9. **Rules that matter live in database constraints**, not in application code
   that can lose a race to a double tap. Precedent:
   `UNIQUE (address, plot_index)`.
10. **The renderer stays framework-free and deterministic** — no React, no DOM
    beyond a canvas context, no `Math.random()`. That is what lets the server
    draw a share card identical to the phone.

---

## 3. Work, in order

Each step is one commit. Do not batch them.

### Step 1 — the renderer *(largest, do it first, everything is judged through it)*

Replace `src/lib/grove/render.ts` drawing with an aquarium. Keep the
`renderGrove(ctx, options)` signature and the seeded determinism.

- Water gradient, brighter at the surface.
- Light shafts from above, slowly drifting.
- Caustics on the substrate.
- Substrate with texture; plants rooted in it, swaying on a slow sine, out of
  phase with each other.
- Fish swimming continuous paths, tail motion proportional to speed, turning at
  the glass, drifting vertically. **No teleporting and no linear tracks.**
- Bubbles rising with wobble.
- Depth: further back is smaller, hazier, slower.
- Glass frame and sheen; the tank is a rect **inside** the canvas whose size
  comes from stake amount.
- `prefers-reduced-motion` renders a **still, composed frame**, not a broken
  one — it is also the share card's frame, so it must look deliberate.

A working reference sketch of all of the above exists; ask the user for the
"The Tank" artifact link if you want it.

**Acceptance:** `npm run build` passes; `/api/share` still returns a 1200×630
PNG; a still frame looks composed.

### Step 2 — species and progression

Rewrite `src/lib/grove/species.ts` and `progression.ts`.

```
grass   Common     unlockDay 0
guppy   Common     unlockDay 0
angel   Uncommon   unlockDay 2
jelly   Rare       unlockDay 4
shark   Apex       unlockDay 7
whale   Apex       unlockDay 12
```

**The whale is the top *time* tier, never a money tier.** A whale here means you
stayed, not that you are rich — that subversion is the point.

Appearance by tier, driven by the existing per-specimen seed:
Common is **identical for everyone** (this is what makes rare legible as rare
without a label); Uncommon has 2–3 colour morphs; Rare varies broadly; Apex has
a distinctive silhouette with seeded colouring.

Add `rollRarity(daysStaked, rng)` implementing the §1 table, and
`slotsFor(stakedLuna)` — a log scale, roughly 4 slots at the 100 NIM minimum up
to about 20 at a million.

### Step 3 — schema migration `002_tank.sql`

Forward-only; do not edit `001_init.sql`.

```sql
ALTER TABLE groves
  ADD COLUMN handle VARCHAR(32) NOT NULL DEFAULT '',
  ADD COLUMN charges_updated_at DATETIME NULL,
  ADD COLUMN best_streak SMALLINT UNSIGNED NOT NULL DEFAULT 0;
-- backfill handles, then:
ALTER TABLE groves ADD UNIQUE KEY uniq_handle (handle);

-- Everything ever discovered. Permanent.
CREATE TABLE specimens (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  address      VARCHAR(44) NOT NULL,
  species      VARCHAR(24) NOT NULL,
  tier         ENUM('common','uncommon','rare','legendary') NOT NULL,
  seed         INT UNSIGNED NOT NULL,
  discovered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- NULL when returned to the reef; the guide entry survives either way.
  slot         TINYINT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_slot (address, slot),
  KEY idx_addr (address),
  CONSTRAINT fk_spec_grove FOREIGN KEY (address) REFERENCES groves (address) ON DELETE CASCADE
);

-- Charge spends, one row per roll. Also the audit trail.
CREATE TABLE rolls (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  address    VARCHAR(44) NOT NULL,
  rolled_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source     ENUM('charge','payment') NOT NULL,
  PRIMARY KEY (id),
  KEY idx_addr_time (address, rolled_at),
  CONSTRAINT fk_roll_grove FOREIGN KEY (address) REFERENCES groves (address) ON DELETE CASCADE
);

CREATE TABLE feeds (
  address VARCHAR(44) NOT NULL,
  day     DATE NOT NULL,
  PRIMARY KEY (address, day),
  CONSTRAINT fk_feed_grove FOREIGN KEY (address) REFERENCES groves (address) ON DELETE CASCADE
);

CREATE TABLE feedings (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  from_address VARCHAR(44) NOT NULL,
  to_address   VARCHAR(44) NOT NULL,
  day          DATE NOT NULL,
  device_hash  CHAR(64) NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- The rate limit. In the database, not in a check that can be raced.
  UNIQUE KEY one_per_device_per_day (device_hash, day),
  KEY idx_recipient_day (to_address, day),
  CONSTRAINT fk_fed_from FOREIGN KEY (from_address) REFERENCES groves (address) ON DELETE CASCADE,
  CONSTRAINT fk_fed_to   FOREIGN KEY (to_address)   REFERENCES groves (address) ON DELETE CASCADE
);
```

`plants` stays for now; drop it in a later migration once nothing reads it.

### Step 4 — charges and rolling

Server-side only. The client never decides how many charges it has.

- `chargesAvailable(address)` — derived from `charges_updated_at` and rolls
  since, capped at 3, one per 8 hours. Never stored as a counter that can drift.
- `POST /api/roll` — spend a charge, roll rarity from days staked, pick a
  species from the unlocked set for that tier, insert a specimen with a random
  seed, auto-assign a slot if one is free. **409 when no charges.**
- Payments grant charges: extend the 15-minute tick to look for new distinct
  counterparties per address since the last tick and record a `payment` charge.

**Acceptance:** a script proves that 4 rolls in a row give 3 successes and a
409, and that waiting does not grant more than 3.

### Step 5 — slots, curating, field guide

- `GET /api/guide` — everything discovered, grouped by species and tier.
- `POST /api/specimen/:id/display` and `/release` — move in and out of a slot.
  `UNIQUE (address, slot)` enforces capacity; a race loses at the constraint.
- Releasing **never** deletes the specimen row. Only `slot` becomes NULL.

### Step 6 — feeding

- `POST /api/feed` — own tank, once per UTC day, builds the streak. Free, works
  at zero stake. A missed day resets the streak but **never removes an unlocked
  cosmetic**; keep `best_streak`.
- Nothing ever dies from a missed feed. The tank simply does not advance.

### Step 7 — feed a stranger

- `GET /api/feed/candidates` — three tanks unfed today, weighted toward the
  fewest lifetime feeds received, never your own, identified by **handle**.
- `POST /api/feed/give` — `{ handle, deviceId }`. **Gated on
  `requestDeviceIdentifier()`, not on wallet** — a wallet is free to create; the
  device id is stable across reinstalls and across accounts on one phone.
  Outside Nimiq Pay the identifier does not exist, so **disable giving there**
  rather than falling back to something weaker.
- Being fed does **not** advance the recipient's streak, or a popular tank farms
  its streak while its owner never opens the app.

### Step 8 — UI and copy

Rework `src/app/page.tsx`, rename `Grove.tsx` → `Tank.tsx`, update all three
languages in `src/lib/i18n/strings.ts`. Keep the signed-out community view: a
stranger must see a living tank **before** any wallet prompt.

### Step 9 — the simulator, in the app

Drag days and NIM, see what the tank becomes. Cheap, because the renderer is
already fully parametric — the sliders just drive `renderGrove` directly.

It does three jobs at once, which is why it is a numbered step and not a nice
to have:

- A judge sees the whole arc in ten seconds, which is what lets the real curve
  be years long without the app looking empty to somebody evaluating it.
- A new user sees what they are working toward — aspiration rather than a
  locked door.
- It is honest: labelled a preview, never dressed up as your own tank.

**Cap the day slider at the last species actually shipped.** Do not reveal
content that is not built or is months from release. At the cap, say
"and more, over the years" rather than stopping silently.

Locked species still appear in the field guide as **silhouettes** with their
unlock day. That tells somebody a whale exists at 365 days without spending
the reveal — the Pokédex device, and it is the whole reason the ladder can be
long without feeling empty.

**Acceptance:** the slider cannot be dragged past the last implemented species;
the whale is not visible in the simulator unless the whale is built.

### Step 10 — PWA

`manifest.webmanifest` plus icons, so it installs from Chrome/Edge on Windows
and Safari's *Add to Dock* on macOS. About an hour. No signing, no store.

---

## 4. Deferred — do not start these

- **Validator museums.** The strongest social idea and specced in
  `docs/SPEC-tank.md` §5, but it will not be built well before 7 Sep. After.
- Native desktop widget — needs a paid developer account and notarisation for a
  surface the competition does not judge.
- Any leaderboard.

## 5. Decided 25 Aug — treat these as settled

- **Name: Reef.** Done, 26 Aug — `reef.nimiq.cafe` is live with its own
  certificate. Internal identifiers (`grove.service`, `/opt/grove`, the `grove`
  database) deliberately still say grove; renaming them buys nothing and risks
  a broken deploy. User-facing copy in three languages is still owed, in Step 8.
- **Unstaking is forgiving.** The streak resets and rarity odds fall back, no
  new rolls come from staking — but **every specimen stays**. The whole app sits
  on top of somebody's real money; taking it back must never cost them the
  collection.
- **Withdrawals lower the water level.** The vessel tracks the real balance in
  both directions, which is what makes "money creates room" honest rather than
  a one-way ratchet. Level only — never harms a specimen.

## 6. Open, non-blocking

- Cloudflare SSL mode → Full (strict), now that the origin certificate matches.
- Repo goes public before submission; scan history for secrets first.
- Nimiq Pay directory listing is optional and separate from the competition.

## 7. Still owed from earlier phases

- The **testnet staking test** never happened. `sendNewStakerTransaction` is
  still unproven on a device. Long-press settings ~10s in Nimiq Pay to reveal
  the network switch, then Get free NIM.
- Sip & Ship calls: 2, 9, 16 Sep. Marketing is 25 of 105 points.
- **Stake now, not later.** The whale unlocks at 12 unbroken days. Entries go
  public on 7 Sep and judging runs after 18 Sep, so anybody starting at the
  public date reaches day 12 on the very last day — and a judge signing in
  afterwards never sees one at all. The whale is the signature payoff and the
  joke the app is built around. Staking on **25 Aug** puts a whale in the
  demo tank by **6 Sep**, a day before entries go public, so it exists in the
  community view and in everyone's field guide from day one.

## 8. Testing

`scripts/auth-smoke.mjs` must keep passing — case 7, the impersonation attempt,
must stay **401**. If it ever returns 200, any wallet can claim any tank.

Replace `scripts/grove-smoke.mjs` with `tank-smoke.mjs` covering: charges cap at
3, a fourth roll is 409, releasing keeps the guide entry, giving twice from one
device in a day is 409, and giving with no session is 401.

## 9. Where the points come from

| Category | Pts | Earned by |
| --- | --- | --- |
| Design & UX | 25 | Step 1, and only Step 1. Spend the time there. |
| Functionality | 25 | Steps 4–7 — the loop, the curation decision, the social action |
| Usefulness & originality | 25 | Nothing ambient existed among Cycle 1's 62 entries |
| Marketing & distribution | 25 | Share card, daily posts, four calls, early-access week |
| Bonus | 5 | NIM staking is the core mechanic |

Marketing cannot be back-filled in the final week. Post progress from Step 1.
