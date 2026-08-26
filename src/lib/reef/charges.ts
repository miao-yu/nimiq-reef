/**
 * Interaction charges — the attendance axis, on the chain's clock.
 *
 * One charge per **epoch**, three at most. A Nimiq epoch is 43,200 blocks at
 * one second each, so that is twice a day passively. Using an epoch rather than
 * an invented timer means "your reef refills each epoch" is a true, publicly
 * verifiable statement about the chain instead of a decorative one.
 *
 * A wallet used during an epoch earns one extra charge for it — capped at one
 * however many transactions were made. With a hard ceiling of three there is
 * nothing for a spammer to gain, which is why the simple rule is safe and the
 * distinct-counterparty machinery an earlier draft called for is unnecessary.
 *
 * **Checking more often must never yield more.** That property is what makes a
 * bot worthless here and keeps the app restful. There is deliberately no
 * reduced-value tier past the cap — telling a committed player the twentieth
 * tap is still worth *something* reopens the grind through the side door.
 */
export const MAX_CHARGES = 3;

/**
 * Policy.BLOCKS_PER_EPOCH (43,200) x Policy.BLOCK_SEPARATION_TIME (1,000ms).
 * Measured against @nimiq/core 2.20.0; the tick asserts it still holds, so a
 * protocol change is noticed rather than silently mispriced.
 */
export const EPOCH_MS = 43_200 * 1_000;

/** After this long with no events the bucket is certainly full again. */
export const FULL_AFTER_MS = MAX_CHARGES * EPOCH_MS;

export interface ChargeState {
  available: number;
  /** ms until the next charge returns, or null when already full. */
  nextInMs: number | null;
}

export interface ChargeEvent {
  at: Date;
  /** -1 for a roll, +1 for an earned bonus. */
  delta: number;
}

/**
 * Replay the event log through a token bucket.
 *
 * Derived entirely from when things happened — no stored counter, no "last
 * settled" anchor. An earlier version stamped an anchor on every spend, which
 * reset the very window the spend was meant to count against, so the balance
 * never moved. A log cannot drift that way: the same timestamps always replay
 * to the same answer.
 *
 * Regeneration is continuous rather than stepwise, so a charge seven-eighths of
 * the way back is not silently rounded away.
 */
export function chargesFrom(events: readonly ChargeEvent[], now: Date = new Date()): ChargeState {
  const windowStart = now.getTime() - FULL_AFTER_MS;
  const relevant = events
    .map((e) => ({ at: e.at.getTime(), delta: e.delta }))
    .filter((e) => e.at > windowStart)
    .sort((a, b) => a.at - b.at);

  let level = MAX_CHARGES;
  let last = windowStart;

  for (const event of relevant) {
    level = Math.min(MAX_CHARGES, level + (event.at - last) / EPOCH_MS);
    level = Math.max(0, Math.min(MAX_CHARGES, level + event.delta));
    last = event.at;
  }
  level = Math.min(MAX_CHARGES, level + (now.getTime() - last) / EPOCH_MS);
  level = Math.max(0, level);

  const available = Math.floor(level + 1e-9);
  if (available >= MAX_CHARGES) return { available: MAX_CHARGES, nextInMs: null };
  return { available, nextInMs: Math.ceil((available + 1 - level) * EPOCH_MS) };
}
