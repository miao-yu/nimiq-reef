/**
 * The vessel — everything stake amount governs.
 *
 * One normalised value drives both how deep the water sits and how many
 * specimens can be displayed, so the vessel stays a single idea rather than
 * two settings that can disagree.
 *
 * The curve is piecewise on the log rather than uniform, because a uniform log
 * spends as much visual range on 1M to 10M — where almost nobody is — as on 5k
 * to 50k, where most stakers actually live. These anchors give the 5k–500k band
 * roughly half the total range, so a doubling there moves the waterline about
 * thirteen pixels instead of nine, while the whale end compresses to a few.
 *
 * That is the intended trade: resolution where people are, headroom where they
 * are not. Anchors are tuning, not principle — move them if the real
 * distribution turns out different.
 */
const ANCHORS: [nim: number, v: number][] = [
  [100, 0],
  [1_000, 0.22],
  [5_000, 0.42],
  [50_000, 0.68],
  [500_000, 0.9],
  [10_000_000, 1],
];

export const MIN_STAKE_NIM = ANCHORS[0]![0];
export const MAX_SCALE_NIM = ANCHORS[ANCHORS.length - 1]![0];

/** 0 at the protocol minimum, 1 at the top of the scale. */
export function vessel(stakedLuna: number): number {
  const nim = stakedLuna / 1e5;
  if (nim <= 0) return 0;
  const clamped = Math.min(MAX_SCALE_NIM, Math.max(MIN_STAKE_NIM, nim));
  const x = Math.log10(clamped);

  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const [loNim, loV] = ANCHORS[i]!;
    const [hiNim, hiV] = ANCHORS[i + 1]!;
    const lo = Math.log10(loNim);
    const hi = Math.log10(hiNim);
    if (x <= hi) return loV + ((x - lo) / (hi - lo)) * (hiV - loV);
  }
  return 1;
}

/**
 * How deep the water sits, 0..1 of the glass.
 *
 * A zero stake still gets real water — the free tier is a tank, not a locked
 * door. Depth deliberately does **not** gate which species can live there: "a
 * whale needs deep water" is intuitive and would stop a year-long small staker
 * displaying the whale they earned, which is punishing loyalty for poverty.
 */
export function depthForStake(stakedLuna: number): number {
  if (stakedLuna <= 0) return 0.42;
  return 0.48 + vessel(stakedLuna) * 0.52;
}

/** How many specimens can be on display. Never affects what you find. */
export function slotsFor(stakedLuna: number): number {
  if (stakedLuna <= 0) return 3;
  return Math.round(4 + vessel(stakedLuna) * 16);
}
