import { addDays, utcDay } from './day';

/** How far back either definition of the staking streak will look. */
export const STAKE_LOOKBACK_DAYS = 400;

/**
 * Unbroken days staked, walking back from today.
 *
 * Forgiving by design: a day we never observed neither counts nor breaks the
 * run — our own tick outage should not reset somebody's streak. A day we *did*
 * observe with nothing staked does break it; that is the user's choice, and
 * the reef pausing is the honest consequence.
 *
 * Pure, and separate from the query that feeds it, because the community list
 * computes the same number in SQL and the two have to be checkable against
 * each other. They were not, and they had already diverged.
 */
export function stakingStreak(
  observed: ReadonlyMap<string, number>,
  lookback = STAKE_LOOKBACK_DAYS,
  today = utcDay(),
): number {
  let streak = 0;
  let cursor = today;
  for (let i = 0; i <= lookback; i++) {
    const staked = observed.get(cursor);
    if (staked === undefined) {
      cursor = addDays(cursor, -1);
      continue; // never watched that day; say nothing about it
    }
    if (staked <= 0) break;
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
