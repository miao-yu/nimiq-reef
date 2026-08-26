# Spec — the tank

Supersedes `docs/SPEC-tending.md` for the aquarium theme. The mechanics survive
the theme change; watering becomes feeding, which is a more natural daily act
than tending a garden that grows from staking.

Name still open. `Reef` is the current proposal — a reef is built slowly by many
small organisms into something that hosts everything else, which is what a
staking pool is.

---

## 1. Money buys the tank. Time fills it.

This replaces the old "amount never matters" rule with something that gives big
stakers a real reward without making the app pay-to-win.

| Driven by **stake amount** | Driven by **unbroken days staked** |
| --- | --- |
| Tank width and depth | Which species you can keep |
| Volume of water | How many of them |
| Glass, frame, the vessel itself | Which rarity tiers are open to you |

A whale on day one has a **magnificent, nearly empty tank**. A hundred-NIM
staker on day thirty has a modest tank teeming with life. Both are impressive
and neither is winning.

That tension is the design. It rewards size honestly — a bigger tank *looks*
grander, and it is displaying a real number the way a balance does — while
keeping every piece of *content* on the time axis, so nobody can buy their way
past someone who simply showed up.

**Amount must never affect rarity odds.** Paying for better odds is a loot box
with a price tag, which is the gambling rule and a disqualification risk, not a
deduction.

### Earn the whale with time

The whale is the top time-tier unlock, not the top money-tier. A whale here
means you **stayed**, not that you are rich — diamond hands, not deep pockets.
A small staker who held three weeks swimming a whale past a newcomer's guppy is
a better story than the reverse, and it subverts what the word means in crypto
rather than restating it.

---

## 2. Rarity — rolled on interaction, weighted by loyalty

**Superseded 25 Aug.** The earlier "guaranteed tier, seeded variant" gave
novelty but no anticipation. The decided model:

- **Attendance decides when a roll happens** — spending one of three charges.
- **Loyalty decides what is possible** — days staked set the rarity weights.
- **Every roll produces a specimen.** There is never an empty outcome.

Curve and charge rules live in `docs/PLAN.md` §1, which is authoritative.

### Why this stays clear of the gambling rule

The risk is real but low, and three cheap precautions defuse it, none of which
cost anything:

1. **No empty results.** "I found something and today it was ordinary", not
   "I opened a box and got junk".
2. **Rarity can never become value.** No trading, no gifting, no leaderboard
   ranked by rarity. The moment a legendary confers chaseable status, there is
   a prize.
3. **Discovery, not opening.** "A rare angelfish has appeared in your tank",
   never "you won".

Gambling needs consideration, chance and a prize of value. This has chance and
nothing else.

Variation scales with rarity, which is also how it should read:

| Tier | Appearance |
| --- | --- |
| Common | **Identical for everyone.** Water grass is water grass. |
| Uncommon | Two or three colour morphs |
| Rare | Broad seeded variation — colour, pattern, fins. Two people's rare fish look clearly different |
| Apex (shark, whale) | Distinctive silhouette, seeded colouring, one per tank |

Common species being uniform is deliberate: it makes the rare ones legible as
rare without a label.

---

## 3. Feeding — the daily action

**One feed per tank per UTC day.** Free, works with zero stake.

Fish needing feeding is something everyone already understands, which is why
this beats "tend your garden". It builds a **feeding streak**, which unlocks
cosmetics. It never touches what the chain determines.

- Streak = consecutive UTC days fed. A missed day resets it.
- **Unlocked cosmetics stay unlocked forever.** You lose the number, never the
  things.
- `best_streak` is kept, so the number you reached is never erased.
- Fish are never harmed by a missed feed. Nothing dies. The tank simply does not
  advance that day.

Stricter than the *staking* streak, which is forgiving because a gap there might
be our own tick outage. A missed feed is unambiguous.

| Feed streak | Unlocks |
| --- | --- |
| 2 days | Live gravel — small invertebrates in the substrate |
| 5 days | Dusk lighting — the tank light dims, colours shift |
| 10 days | Bubble column |

---

## 4. Feed someone else's tank

**One given feed per device per UTC day.**

Three tanks that have not been fed today, weighted toward those with the fewest
lifetime feeds received so newcomers get attention. Never your own.

- **Recipient** sees a count — "fed by 3 people today" — plus a lifetime total,
  and the fish visibly cluster and feed for that day.
- **Giver** gets a lifetime count, and at 5 given, a cleaner shrimp appears
  permanently: a small marker that you feed other people's fish.

Being fed does **not** advance the recipient's streak. Otherwise a popular tank
farms its streak while its owner never opens the app.

**Gated on `requestDeviceIdentifier()`, not on wallet.** A wallet is free to
create; the device identifier is stable across reinstalls and across different
accounts on the same device, which is exactly the farm this stops. Outside
Nimiq Pay the identifier does not exist, so giving is disabled there rather than
falling back to something weaker.

---

## 5. Validator museums

Every validator is a **public aquarium**, and everyone delegating to it is an
exhibit inside.

This is the strongest social mechanic available to us because it needs no
social graph — the group is already true on-chain the moment you delegate, with
no invites and no follows. It also hands every validator operator in the Nimiq
ecosystem a reason to tell their own stakers about the app.

- A museum page per validator: its tanks, its collective stats, its species
  spread.
- Members see which museum they are in and can visit others.
- Re-delegating moves you between museums — a real chain action with a meaning,
  and the protocol's reporting window already enforces that you cannot flit
  between them freely.

### Ranking museums, without a whale board

Ranking by total stake would just rank validators by size, which is neither
interesting nor fair, and it would contradict section 1.

Rank by **collective care**: the sum of member feeding streaks, the share of
member tanks fed today, species diversity across the museum. A small validator
with twenty devoted stakers can top a large one with a thousand absent ones.
That is worth competing over and it is the metric we actually want to encourage.

---

## 6. Desktop

The ask: pinned on a laptop screen without opening the app.

**Ship now — installable web app.** A manifest plus icons makes the tank
installable from Chrome and Edge on Windows, and from Safari's *Add to Dock* or
Chrome's *Install* on macOS. It gets its own window, its own dock or taskbar
icon, and no browser chrome. Roughly an hour of work, no signing, no store, no
native code.

**Already have — the live image.** `/api/share` returns a PNG that updates. It
embeds anywhere that renders an image: a README, a Notion page, a dashboard.

**Not now — a true native widget.** macOS Notification Centre and the Windows
widget board both need native code, a paid developer account and notarisation.
That is days of work plus review latency, for a surface the competition does not
judge. Post-competition.

---

## 7. Motion is the product

The reason to switch themes at all: **plants do not move and fish do.** An
ambient app whose whole proposition is "worth opening to look at" needs to be
alive on screen when nothing is happening.

Non-negotiables for the renderer:

- Fish swim on continuous paths with tail motion proportional to speed, turn at
  the glass, and drift vertically. No teleporting, no linear tracks.
- Plants sway on a slow sine, out of phase with each other.
- Bubbles rise and wobble.
- Caustics — moving light on the substrate.
- Depth: things further back are smaller, hazier, slower.
- **`prefers-reduced-motion` renders a still, composed frame** rather than a
  broken one. It is the share card's frame, so it has to look deliberate.

Everything stays seeded and deterministic so the server-side share render is
identical to the phone.

---

## Data model changes from SPEC-tending

`tends` → `feeds`, `waterings` → `feedings`, same shapes and same constraints:
`UNIQUE (address, day)` for own feeding, `UNIQUE (device_hash, day)` for given.
`plants` → `specimens`, with `species` widened and a `tier` column.

`reefs` gains `best_streak` and `hidden`, and keeps `first_day`. It briefly had
a random `handle`; that was dropped on 26 Aug — the address is the identity,
since the chain already discloses everything a reef page would.

The rules that matter still live in database constraints rather than in
application code that can lose a race to a double tap.

---

## What is cut

- Trading, gifting or selling specimens — nothing converts to NIM
- Any purchase of any kind
- Rarity odds influenced by anything at all
- Referral trees. Single level and cosmetic if ever, never a pyramid


---

## Settled 26 Aug — bonus charges are outgoing-only

A charge is earned for an epoch in which the wallet was **spent from**. Money
arriving never earns one.

This is not a preference, it is the only precise option available. We cannot
identify who sent a transaction — `getTransactionsByAddress` needs a history
index the validator does not run — so the app sees a balance move and nothing
more. A validator payout and a friend paying you are the same event to us.

Direction is the one thing that *is* reliable: a payout is always an increase.
Counting only decreases excludes every payout by construction rather than by
heuristic.

It is also the truer reading of the rule. The bonus rewards *using Nimiq Pay*;
receiving money is somebody else using it.

Rejected, with reasons, so this is not relitigated:

- **Count any change.** A pool staker on a fifteen-minute payout cycle would
  earn a bonus every epoch automatically, which makes the bonus a signal of
  nothing.
- **A size threshold on incoming.** Fragile — it depends on payout sizes set by
  validators we do not control, and it would still have missed the 10 NIM
  transfer that prompted the question.
- **Run a history index.** The only way to do this properly, and a full resync
  of chain history on a box running a live validator. After the competition, if
  ever.

The app now says all of this in the discovery panel. The rule fooled the person
who wrote it, which is a reliable sign that leaving it unexplained was the real
defect.
