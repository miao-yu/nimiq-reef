# Fishing

Settled in discussion 26–27 Aug. Not built yet.

Reef's weakness is that it has no verb. "Discover" is a button that does the
work for you, gated by a twelve-hour epoch: you press it, something appears.
Fishing replaces the button with an act. Everything underneath — charges,
tiers, the species ladder, days staked — is unchanged.

## Ponds are validators

Every elected validator is a pond, identified the way everything else in this
app is identified: **its identicon and its truncated address**.

This was chosen over showing registry names and logos because of a number.
Of the 37 currently elected validators, **19 appear in the public registry and
18 do not** — a name-based list would be half blank. Every address has an
identicon. It also keeps the app's one identity rule intact, and avoids
attaching invented species tendencies to named real businesses.

There is no country or location concept. Neither the chain nor the registry
carries one; the registry has name, logo, description, fee and score, and
nothing geographic. Inventing locations for real staking companies would mean
asserting facts about them that we made up.

## Water types

Each pond gets one of six water types, chosen by hashing its address the same
way an identicon is:

    coral shallows · kelp forest · deep trench
    cold current   · sunlit flats · volcanic vent

The type is the pond's whole character: its **name**, its **palette**, and
which species it favours. It doubles as the hint — "deep trench" tells you what
you will find there, so the list needs no species icons to be readable.

**Palettes are hand-authored and selected by address, never derived.** Six
fixed palettes, picked by hash. Deriving colour values from a hash produces
mud — that is exactly how legendary specimens ended up less saturated than rare
ones, and it was invisible until four tiers were rendered side by side.

## The rule that keeps ponds lateral

**A water type shifts which species you get within a tier. It never shifts the
tier odds.**

Tier stays a pure function of days staked. A trench favours whales *among
legendaries*; it does not make a legendary likelier. Without this, picking the
right pond replaces loyalty as the source of rarity, and one pond becomes
correct — at which point everybody fishes it and the choice is dead.

A pond also only reweights species the player has already unlocked. Ponds
change what is likely, never what is possible.

## The flow

    cast → sink → wait → bite → strike → land → reveal

- **Wait**: 3–18 seconds, random. Not up to 30 — thirty seconds of nothing on a
  phone is long enough to switch apps, and then the charge is lost to a
  notification rather than to reflexes.
- **Strike window**: 2 seconds, signposted by the float going under. Anything
  under about 1.2s reads as broken rather than hard once touch latency and
  reaction time are counted.
- **A miss costs the charge**, *except the first miss each UTC day*. A charge is
  worth twelve hours; losing one to a mistimed tap on a bus is a harsh trade,
  and it contradicts the guarantee `/api/roll` currently makes in writing —
  "every roll produces something". Forgiving the first miss keeps the tension
  and kills the rage-quit.
- **No landing mini-game at first.** Two stacked points of failure on a
  twelve-hour charge is a lot of punishment, and the strike is already the
  dramatic beat. Easy to add once the miss rate is known.

## The reveal

Naming the catch is the payoff, and `SPECIES` currently has `label`, `tier` and
`unlockDay` — no description. Eleven short lines are needed, written as a
collectible game would write them rather than as a field guide.

## Bonus

Fishing at the validator the player actually delegates to. It is the only place
the app can reward *which* validator somebody chose rather than how much they
staked.

## Already built, do not rebuild

Keeping everything caught while displaying only a few is **done**. Discovery is
unlimited, display is capped by slots, and `/api/specimen/[id]` moves specimens
between the two. It is buried behind a collapsed header, so it reads as
missing — that is a visibility problem, and the fishing work should surface it.
