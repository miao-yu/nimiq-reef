import 'server-only';
import { rpc, RpcUnavailableError } from './rpc';
import { daysStaked, ensureGrove, listPlants } from './grove-repo';
import { groveDay } from '@/lib/grove/day';
import { plotsUnlocked, speciesUnlocked, nextMilestone, MAX_PLOTS } from '@/lib/grove/progression';
import type { Plant, SpeciesKey } from '@/lib/grove';

export interface GroveState {
  address: string;
  /** Day 1 is the day the grove was created. Growth is measured from here. */
  day: number;
  plants: Plant[];
  /** Unbroken days staked. Everything unlocks off this, never off amount. */
  daysStaked: number;
  stakedLuna: number;
  delegation: string | null;
  plotsUnlocked: number;
  plotsTotal: number;
  freePlots: number[];
  speciesUnlocked: SpeciesKey[];
  next: ReturnType<typeof nextMilestone>;
  /** True when the chain could not be read; the grove is shown from history. */
  chainOffline: boolean;
}

export async function getGroveState(address: string): Promise<GroveState> {
  const grove = await ensureGrove(address);

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
    day: groveDay(grove.firstDay),
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
