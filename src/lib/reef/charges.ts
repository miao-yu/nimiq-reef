/**
 * Interaction charges — the attendance axis, on the chain's clock.
 *
 * One charge when the epoch turns, three at most. A Nimiq epoch is 43,200
 * blocks at one second each, so twice a day. Using the chain's own boundary
 * rather than a private timer means "your reef refills each epoch" is a true
 * statement somebody can verify against a block explorer, and it means every
 * player's charges arrive at the same moment rather than at a personal
 * anniversary of whenever they last spent.
 *
 * An earlier version regenerated continuously at epoch *length*, which drifted
 * from the boundary it claimed to follow — the countdown said twelve hours from
 * your last roll while the epoch might turn in one.
 *
 * A wallet spent from during an epoch earns one extra charge for it, capped at
 * one however many transactions were made. Only outgoing counts: a validator
 * payout is always an increase, so ignoring increases excludes payouts by
 * construction. With a hard ceiling of three there is nothing for a spammer to
 * gain.
 *
 * **Checking more often must never yield more.** That property is what makes a
 * bot worthless here and keeps the app restful. There is deliberately no
 * reduced-value tier past the cap.
 */
export const MAX_CHARGES = 3;

/**
 * Policy.BLOCKS_PER_EPOCH x Policy.BLOCK_SEPARATION_TIME, from @nimiq/core
 * 2.20.0. Only used for the window query and as a sanity bound; the real
 * boundary always comes from the chain.
 */
export const EPOCH_MS = 43_200 * 1_000;
export const FULL_AFTER_MS = MAX_CHARGES * EPOCH_MS;

export interface ChargeState {
  available: number;
  /** ms until the epoch turns, or null when already full. */
  nextInMs: number | null;
  /** 0..1 through the current epoch. Real chain progress, not a timer. */
  epochProgress: number;
  epoch: number;
}

export interface ChargeEvent {
  /** The epoch it happened in. Regeneration steps on epoch boundaries. */
  epoch: number;
  /** -1 for a roll, +1 for an earned bonus. */
  delta: number;
}

/**
 * Replay the event log, stepping one charge per epoch boundary crossed.
 *
 * Integer arithmetic on epoch numbers, so there is no rounding and no drift:
 * the same events in the same epochs always replay to the same answer. Derived
 * entirely from the log — no stored counter, and no "last settled" anchor,
 * which an earlier version used and which reset the very window each spend was
 * meant to count against.
 */
export function chargesFrom(
  events: readonly ChargeEvent[],
  epoch: number,
  msToNextEpoch: number,
  epochMs: number = EPOCH_MS,
): ChargeState {
  // Three epochs back the bucket was certainly full whatever happened before.
  const windowStart = epoch - MAX_CHARGES;
  const relevant = events.filter((e) => e.epoch > windowStart).sort((a, b) => a.epoch - b.epoch);

  let level = MAX_CHARGES;
  let last = windowStart;

  /*
   * The running level is never floored, only capped.
   *
   * Flooring each step at zero forgave overdraft, and a bonus charge then
   * resurrected it: eight spends in one epoch each clamped to 0, the single
   * grant that followed added 1 back, and the balance sat at 1 for ever. Any
   * reef holding a bonus charge in the current epoch could cast without limit
   * — which is exactly what happened in production.
   *
   * Letting it go negative also makes the replay order-independent within an
   * epoch, since addition commutes and the old floor did not.
   */
  for (const event of relevant) {
    level = Math.min(MAX_CHARGES, level + (event.epoch - last));
    level = Math.min(MAX_CHARGES, level + event.delta);
    last = event.epoch;
  }
  level = Math.min(MAX_CHARGES, level + (epoch - last));

  // Only what is reported is floored. A debt stays a debt until epochs repay it.
  const available = Math.max(0, level);

  const progress = epochMs > 0 ? 1 - Math.min(1, Math.max(0, msToNextEpoch / epochMs)) : 0;
  return {
    available,
    nextInMs: level >= MAX_CHARGES ? null : msToNextEpoch,
    epochProgress: progress,
    epoch,
  };
}
