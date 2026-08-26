import 'server-only';
import { rpc, RpcUnavailableError } from './rpc';
import { daysStaked, ensureReef, listPlants } from './reef-repo';
import { reefDay } from '@/lib/reef/day';
import { plotsUnlocked, speciesUnlocked, nextMilestone, MAX_PLOTS } from '@/lib/reef/progression';
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

  const unlocked = plotsUnlocked(streak);
  const taken = new Set(plants.map((p) => Math.round(p.x * 4 - 0.5)));
  const freePlots = Array.from({ length: unlocked }, (_, i) => i).filter((i) => !taken.has(i));

  return {
    address,
    day: reefDay(reef.firstDay),
    plants,
    daysStaked: streak,
    stakedLuna,
    delegation,
    plotsUnlocked: unlocked,
    plotsTotal: MAX_PLOTS,
    freePlots,
    speciesUnlocked: speciesUnlocked(streak),
    next: nextMilestone(streak),
    chainOffline,
  };
}
