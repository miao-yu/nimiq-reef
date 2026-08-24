/**
 * Protocol constants and unit helpers.
 *
 * Some of these are not exposed on the JS `Policy` class, so they are pinned
 * here with a source reference. Re-check against the node on upgrade.
 */

/** 1 NIM = 100,000 Luna. All chain amounts are Luna. */
export const LUNA_PER_NIM = 1e5;

/**
 * Smallest stake the protocol will accept: 10,000,000 Luna = 100 NIM.
 * core-rs-albatross v1.7.2, `primitives/src/policy.rs:140`.
 *
 * The UI has to enforce this. Below it the staking transaction is rejected by
 * the chain, and the user has already approved a dialog for nothing.
 */
export const MINIMUM_STAKE_LUNA = 10_000_000;
export const MINIMUM_STAKE_NIM = MINIMUM_STAKE_LUNA / LUNA_PER_NIM;

export function lunaToNim(luna: number): number {
  return luna / LUNA_PER_NIM;
}

export function nimToLuna(nim: number): number {
  return Math.round(nim * LUNA_PER_NIM);
}

/** Whole NIM, grouped, no trailing decimals — how balances read in the UI. */
export function formatNim(luna: number, locale = 'en'): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(lunaToNim(luna));
}

export function meetsMinimumStake(luna: number): boolean {
  return luna >= MINIMUM_STAKE_LUNA;
}
