/**
 * Interaction charges — the attendance axis.
 *
 * Three at most, one back every eight hours. Somebody who opens the app once a
 * day gets three rolls; somebody who opens it every eight hours gets three
 * rolls. **Checking more often must never yield more.** That single property
 * is what makes a bot worthless here and what keeps the app restful rather
 * than demanding.
 *
 * There is deliberately no reduced-value tier past the cap. Telling a
 * committed player that the twentieth tap is still worth *something* reopens
 * the grind through the side door.
 */
export const MAX_CHARGES = 3;
export const REGEN_MS = 8 * 60 * 60 * 1000;

export interface ChargeState {
  available: number;
  /** ms until the next charge returns, or null when already full. */
  nextInMs: number | null;
}

/**
 * Derived, never stored as a counter.
 *
 * `updatedAt` is when the balance was last settled — set on every spend. From
 * it and the elapsed time the balance is recomputed, so a clock change or a
 * missed write cannot leave a stored number drifting from the truth.
 */
export function chargesAt(
  updatedAt: Date | null,
  spentSinceUpdate: number,
  now: Date = new Date(),
): ChargeState {
  if (!updatedAt) return { available: MAX_CHARGES, nextInMs: null };

  const elapsed = Math.max(0, now.getTime() - updatedAt.getTime());
  const regenerated = Math.floor(elapsed / REGEN_MS);
  const available = Math.max(0, Math.min(MAX_CHARGES, MAX_CHARGES - spentSinceUpdate + regenerated));

  if (available >= MAX_CHARGES) return { available: MAX_CHARGES, nextInMs: null };
  return { available, nextInMs: REGEN_MS - (elapsed % REGEN_MS) };
}
