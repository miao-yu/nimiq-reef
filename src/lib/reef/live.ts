import type { ReefState } from './state';

/**
 * The clocks, advanced on the client between fetches.
 *
 * Every countdown in the app arrived as a number computed on the server and
 * then sat still: the charge ring, the feeding ring and both "resets in"
 * strings were frozen at whatever they were when the page loaded. A cooldown
 * ring that does not move is worse than no ring, because it looks broken.
 *
 * So the smooth part is interpolated here and only the authoritative part —
 * how many charges you actually have, what day it is, what is in the tank — is
 * refetched. `epochTurned` and `dayRolled` are what say a refetch is now due.
 */

export const DAY_MS = 86_400_000;

export interface LiveClock {
  epochProgress: number;
  dayProgress: number;
  /** null when charges are already full, matching the server's meaning. */
  nextChargeInMs: number | null;
  dayResetsInMs: number;
  /** The epoch boundary has passed since the last fetch: a charge is waiting. */
  epochTurned: boolean;
  /** UTC midnight has passed: feeding is available again. */
  dayRolled: boolean;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function liveClock(reef: ReefState, elapsedMs: number): LiveClock {
  const elapsed = Math.max(0, elapsedMs);

  // The chain was unreachable when this state was built, so there is no epoch
  // length to advance along. Hold still rather than invent motion.
  const epochMs = reef.epochMs > 0 ? reef.epochMs : 0;
  const epochProgress = epochMs > 0 ? clamp01(reef.epochProgress + elapsed / epochMs) : reef.epochProgress;
  const epochTurned = epochMs > 0 && epochProgress >= 1;

  const dayLeft = reef.dayResetsInMs - elapsed;

  return {
    epochProgress,
    dayProgress: clamp01(1 - dayLeft / DAY_MS),
    nextChargeInMs:
      reef.nextChargeInMs === null ? null : Math.max(0, epochMs * (1 - epochProgress)),
    dayResetsInMs: Math.max(0, dayLeft),
    epochTurned,
    dayRolled: dayLeft <= 0,
  };
}
