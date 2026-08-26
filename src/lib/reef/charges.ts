/**
 * Interaction charges — the attendance axis.
 *
 * Three at most, one back every eight hours. Somebody who opens the app once a
 * day gets three rolls; somebody who opens it every eight hours gets three
 * rolls. **Checking more often must never yield more.** That single property
 * is what makes a bot worthless here and keeps the app restful rather than
 * demanding. There is deliberately no reduced-value tier past the cap — telling
 * a committed player the twentieth tap is worth *something* reopens the grind.
 */
export const MAX_CHARGES = 3;
export const REGEN_MS = 8 * 60 * 60 * 1000;

/** After this long with no rolls the bucket is certainly full again. */
export const FULL_AFTER_MS = MAX_CHARGES * REGEN_MS;

export interface ChargeState {
  available: number;
  /** ms until the next charge returns, or null when already full. */
  nextInMs: number | null;
}

/**
 * Replay the roll log through a token bucket.
 *
 * Derived entirely from when rolls happened — there is no stored counter and no
 * "last settled" anchor. An earlier version stamped an anchor on every spend,
 * which reset the very window the spend was supposed to count against, so the
 * balance never moved. A log cannot drift like that: the same timestamps always
 * replay to the same answer.
 *
 * Regeneration is continuous rather than stepwise, so a charge that is
 * seven-eighths of the way back is not silently rounded away.
 */
export function chargesFrom(rollTimes: readonly Date[], now: Date = new Date()): ChargeState {
  const windowStart = now.getTime() - FULL_AFTER_MS;
  const relevant = rollTimes
    .map((d) => d.getTime())
    .filter((t) => t > windowStart)
    .sort((a, b) => a - b);

  let level = MAX_CHARGES;
  let last = windowStart;

  for (const at of relevant) {
    level = Math.min(MAX_CHARGES, level + (at - last) / REGEN_MS);
    level -= 1;
    last = at;
  }
  level = Math.min(MAX_CHARGES, level + (now.getTime() - last) / REGEN_MS);
  level = Math.max(0, level);

  const available = Math.floor(level + 1e-9);
  if (available >= MAX_CHARGES) return { available: MAX_CHARGES, nextInMs: null };
  return { available, nextInMs: Math.ceil((available + 1 - level) * REGEN_MS) };
}
