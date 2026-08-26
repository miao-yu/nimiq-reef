import 'server-only';
import { rpc, RpcUnavailableError } from './rpc';
import { daysStaked, ensureReef, listPlants } from './reef-repo';
import { reefDay } from '@/lib/reef/day';
import { slotsFor, speciesUnlocked, nextMilestone } from '@/lib/reef/progression';
export type { ReefState };
import type { ReefState } from '@/lib/reef/state';

export async function getReefState(address: string): Promise<ReefState> {
  const reef = await ensureReef(address);

  let stakedLuna = 0;
  let delegation: string | null = null;
  let chainOffline = false;

  try {
    const staker = await rpc.getStakerByAddress(address);
    if (staker) {
      stakedLuna = Number(staker.balance);
      delegation = staker.delegation;
    }
  } catch (error) {
    // A node outage must not look like "you unstaked". Show what we know from
    // recorded history and say the chain is unreachable.
    if (!(error instanceof RpcUnavailableError)) throw error;
    chainOffline = true;
  }

  const [plants, streak] = await Promise.all([listPlants(address), daysStaked(address)]);

  // Money creates room. If a withdrawal shrinks the tank below what is already
  // in it, nothing is evicted — the floor is what you hold. Withdrawals lower
  // the water, never harm a specimen.
  const capacity = Math.max(slotsFor(stakedLuna), plants.length);
  const taken = new Set(plants.map((p) => p.slot));
  const freePlots = Array.from({ length: capacity }, (_, i) => i).filter((i) => !taken.has(i));

  return {
    address,
    day: reefDay(reef.firstDay),
    plants,
    daysStaked: streak,
    stakedLuna,
    delegation,
    plotsUnlocked: capacity,
    plotsTotal: capacity,
    freePlots,
    speciesUnlocked: speciesUnlocked(streak),
    next: nextMilestone(streak),
    chainOffline,
  };
}
