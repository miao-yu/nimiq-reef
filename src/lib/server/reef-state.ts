import 'server-only';
import { rpc, RpcUnavailableError } from './rpc';
import {
  daysStaked,
  ensureReef,
  listPlants,
  fedToday as fedTodayQuery,
  feedStreak,
  feedingCounts,
  rememberBestStreak,
  chargeEvents,
  lastKnownEpoch,
} from './reef-repo';
import { reefDay, utcDayClock } from '@/lib/reef/day';
import { speciesUnlocked, nextMilestone } from '@/lib/reef/progression';
import { slotsFor } from '@/lib/reef/vessel';
import { chargesFrom, MAX_CHARGES } from '@/lib/reef/charges';
export type { ReefState };
import type { ReefState } from '@/lib/reef/state';

export async function getReefState(address: string): Promise<ReefState> {
  const reef = await ensureReef(address);

  let stakedLuna = 0;
  let delegation: string | null = null;
  let chainOffline = false;
  // Charges arrive when the epoch turns, so the clock must come from the
  // chain. If it cannot be read we fall back to the last epoch we recorded and
  // report no countdown rather than inventing one.
  let clock = { epoch: 0, msToNext: 0, epochMs: 0 };

  try {
    const staker = await rpc.getStakerByAddress(address);
    if (staker) {
      stakedLuna = Number(staker.balance);
      delegation = staker.delegation;
    }
    clock = await rpc.epochClock();
  } catch (error) {
    // A node outage must not look like "you unstaked". Show what we know from
    // recorded history and say the chain is unreachable.
    if (!(error instanceof RpcUnavailableError)) throw error;
    chainOffline = true;
    clock = { epoch: await lastKnownEpoch(address), msToNext: 0, epochMs: 0 };
  }

  const [plants, streak, fedToday, feeding, counts, spent] = await Promise.all([
    listPlants(address),
    daysStaked(address),
    fedTodayQuery(address),
    feedStreak(address),
    feedingCounts(address),
    chargeEvents(address, clock.epoch - MAX_CHARGES),
  ]);
  const charges = chargesFrom(spent, clock.epoch, clock.msToNext, clock.epochMs);
  const dayClock = utcDayClock();
  if (feeding > reef.bestStreak) await rememberBestStreak(address, feeding);

  // Money creates room. If a withdrawal shrinks the tank below what is already
  // in it, nothing is evicted — the floor is what you hold. Withdrawals lower
  // the water, never harm a specimen.
  const capacity = Math.max(slotsFor(stakedLuna), plants.length);
  const taken = new Set(plants.map((p) => p.slot));
  const freePlots = Array.from({ length: capacity }, (_, i) => i).filter((i) => !taken.has(i));

  return {
    address,
    day: reefDay(reef.firstDay),
    hidden: reef.hidden,
    plants,
    daysStaked: streak,
    stakedLuna,
    delegation,
    plotsUnlocked: capacity,
    plotsTotal: capacity,
    freePlots,
    speciesUnlocked: speciesUnlocked(streak),
    next: nextMilestone(streak),

    charges: charges.available,
    maxCharges: MAX_CHARGES,
    nextChargeInMs: charges.nextInMs,
    epoch: charges.epoch,
    epochProgress: charges.epochProgress,

    fedToday,
    dayResetsInMs: dayClock.resetsInMs,
    dayProgress: dayClock.progress,
    feedStreak: feeding,
    bestStreak: Math.max(reef.bestStreak, feeding),
    gaveToday: false,
    receivedToday: counts.receivedToday,
    receivedLifetime: counts.receivedLifetime,
    givenLifetime: counts.givenLifetime,

    chainOffline,
  };
}
