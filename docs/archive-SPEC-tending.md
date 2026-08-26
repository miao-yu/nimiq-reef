# Spec — daily tending and watering strangers

Two mechanics that give Reef a reason to open today, and a way to act on
somebody else's reef without a friend graph we do not have.

Written 25 Aug 2026. Target: shipped before the public date, Mon 7 Sep.

## Why these two

The gap is not decoration, it is that **Reef currently has no daily action at
all.** You plant three or four things in week one and become a spectator. Every
app that retains in this category has a reason to open today — ORO is 3.9M users
around a single daily tap; GlowCave is an ambient collection game with one free
daily action and 49% of its lifetime users active this week.

The second mechanic answers the structural problem from `docs/RESEARCH.md`:
Telegram and Farcaster mini apps inherit a social graph, and **we have wallet
addresses and nothing else.** Anything phrased as "invite your friends" assumes
infrastructure we cannot build. Watering a stranger needs no graph.

## Guardrails these must not break

Both existing rules survive intact, and that is deliberate:

1. **Growth stays paced by unbroken days staked.** Tending never touches plant
   growth. It runs on a parallel, purely cosmetic track. Growth remains derived
   from the chain, so the garden still cannot drift away from what actually
   happened.
2. **Nothing converts to NIM.** Every reward here is cosmetic. No token, no
   points with a price, no referral multiplier.

A third rule, new, from what the research turned up:

3. **No referral pyramid.** DNA on World App runs a five-level tree with 10×
   multipliers per tier and tradable referral NFTs; it has 835K users and it is
   a pyramid scheme in a costume. World's own first-party programme is single
   level with per-user caps. If Reef ever does referrals, that is the ceiling.

---

## Mechanic 1 — tend your own reef

**One tend per reef per UTC day.** Free, works with zero stake.

The tick already waters automatically off your staking position. Hand-tending
must therefore do something *different* or it is busywork with a button. It
does: it builds a **tending streak**, which unlocks cosmetics. Growth is
untouched.

This is what gives the free tier a daily loop. Somebody who never stakes still
has a reason to open the app, and still gets something that visibly accumulates.

### Streak rules

- Streak = consecutive UTC days with a tend.
- A missed day resets the streak to zero.
- **Cosmetics already unlocked stay unlocked forever.** You lose the number, not
  the things. Losing earned decoration for missing a Tuesday is the kind of
  punishment that makes people delete an app.
- `best_streak` is recorded, so the number you reached is never erased either.

Streaks break on a miss — unlike the *staking* streak, which is deliberately
forgiving because a gap there can be our own tick outage. A missed tend is
unambiguous: nobody tapped.

### Cosmetic ladder

Compressed for the competition calendar, same reasoning as the species
thresholds: a tester arriving on 7 Sep has eleven days.

| Tend streak | Unlocks | Render cost |
| --- | --- | --- |
| 2 days | **Ground cover** — small flowers scattered through the soil | low |
| 5 days | **Dusk** — evening sky palette | low, palette swap |
| 10 days | **Fireflies** — a few soft glows above the plants | low, static under reduced-motion |

Three, not eight. Every one has to be drawn, and Phase 3 is where the Design
points actually live.

---

## Mechanic 2 — water a stranger's reef

**One given watering per device per UTC day.**

You are shown three reefs that have not been watered today, and you can water
one. No friend graph, no invites, no follow list.

### Selection

Weighted toward reefs with the **fewest lifetime waterings received**, so
newcomers and quiet reefs get attention rather than the same few gardens
collecting everything. Random among that pool, and never your own.

### What each side gets

- **Recipient:** a visible count — "watered by 3 people today" — and a lifetime
  total. Received waterings also add flowers to the ground for that day, so
  being watered *looks* like something, not just a number.
- **Giver:** a lifetime `given` count, and at 5 given a **bird** appears in the
  reef — a small permanent marker that you are someone who waters other people.

Being watered deliberately does **not** advance the recipient's tending streak.
Otherwise a popular reef farms its streak passively while its owner never opens
the app, and the streak stops meaning "you showed up".

### Anti-abuse

One wallet is free to create, so a per-wallet limit is worth nothing. Gate the
**given** action on `requestDeviceIdentifier()` — the SDK returns a pseudonymous
per-origin hash that is stable across reinstalls *and across different accounts
on the same device*, which is exactly the farm this needs to stop.

That primitive exists for this and, going by Cycle 1, almost nobody used it.

Fallbacks: outside Nimiq Pay the identifier is unavailable, so **giving is
disabled outside the host app** rather than falling back to something weaker.
Tending your own reef needs no device gate — multi-walleting to tend your own
reefs gains nothing, since each wallet is its own reef.

---

## Handles

Social features need to name a reef without naming a wallet.

Add a `handle` to each reef: a short generated slug, `quiet-fern-42` shaped,
unique, assigned on creation. Every social surface uses it. **The address never
appears in a payload a stranger can read** — it is already public on-chain, but
linking it to in-app behaviour is a step we should not take on someone's behalf,
and `/api/community` deliberately omits it today.

Handles also give people something to say out loud, which the address does not.

---

## Data model

```sql
ALTER TABLE reefs
  ADD COLUMN handle VARCHAR(32) NOT NULL,
  ADD COLUMN best_streak SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  ADD UNIQUE KEY uniq_handle (handle);

-- One row per reef per day it was tended. Presence is the fact; there is
-- nothing else to store.
CREATE TABLE tends (
  address VARCHAR(44) NOT NULL,
  day     DATE        NOT NULL,
  PRIMARY KEY (address, day),
  CONSTRAINT fk_tends_reef FOREIGN KEY (address) REFERENCES reefs (address) ON DELETE CASCADE
);

CREATE TABLE waterings (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  from_address VARCHAR(44)     NOT NULL,
  to_address   VARCHAR(44)     NOT NULL,
  day          DATE            NOT NULL,
  -- SHA-256 from requestDeviceIdentifier(), per-origin and pseudonymous.
  device_hash  CHAR(64)        NOT NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- The rate limit, enforced by the database rather than by a check that can
  -- lose a race with a double tap.
  UNIQUE KEY one_per_device_per_day (device_hash, day),
  KEY idx_recipient_day (to_address, day),
  CONSTRAINT fk_water_from FOREIGN KEY (from_address) REFERENCES reefs (address) ON DELETE CASCADE,
  CONSTRAINT fk_water_to   FOREIGN KEY (to_address)   REFERENCES reefs (address) ON DELETE CASCADE
);
```

Same principle as `UNIQUE (address, plot_index)` for planting: the rule that
matters lives in a constraint, not in application code that can be raced.

Note `tends` has no unique-per-device key. That is intentional — see anti-abuse.

## API

| Route | Behaviour |
| --- | --- |
| `POST /api/reef/tend` | Tend own reef. Idempotent per day: a second call returns the same state rather than an error. |
| `GET /api/water/candidates` | Three reefs to water, by handle. Excludes self and anything already watered today by this device. |
| `POST /api/water` | `{ handle, deviceId }`. Records it. 409 if this device already gave today. |

`ReefState` gains: `tendedToday`, `tendStreak`, `bestStreak`, `cosmetics[]`,
`wateredTodayBy`, `wateredLifetime`, `givenLifetime`, `handle`.

## Renderer

Three additions to `renderReef`, all driven by an options field so the share
image gets them too:

- `groundCover: number` — flower density in the soil, from streak plus today's
  received waterings.
- `sky: 'day' | 'dusk'`
- `fireflies: boolean` — static glows when `prefers-reduced-motion` is set.

All deterministic and seeded, like everything else in there, so the server-side
share card renders identically to the phone.

## Edge cases

- **Day boundary during a session.** Everything is UTC and derived on read, so a
  session spanning midnight simply sees the new day on the next request.
- **Tending before the reef exists.** `ensureReef` already runs on every state
  read; tend goes through the same path.
- **Watering a reef that gets deleted.** Cascade handles it.
- **Device identifier denied.** The user refused the prompt: giving stays
  disabled and says so plainly. Not an error state.
- **Clock skew on the phone.** The day comes from the server. The client never
  decides what day it is.

## Out of scope

- Watering someone back (needs a notification surface we do not have)
- Display names (handles are enough, and names need moderation)
- Validator reefs — the stretch, specced separately if these two land early
- Any leaderboard. If one is ever added it ranks **days staked**, never amount:
  a 100 NIM staker and a whale accumulate that identically, so it is the only
  ranking that does not contradict guardrail 1.

## Where this earns points

- **Functionality** — the standing weakness. A thing that only grows by itself
  reads as a toy; a daily action plus a social action is a game.
- **Marketing** — watering strangers is the first mechanic in Reef that
  produces an interaction between two people, which is what makes a community
  reef worth returning to.
- **Design** — three cosmetics is a small, drawable surface rather than a
  sprawl, which suits the one phase we have left for polish.
