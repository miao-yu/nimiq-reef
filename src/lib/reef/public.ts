import type { Plant } from './types';

/**
 * What anybody may see about a reef.
 *
 * Declared apart from the repository so a client component can be typed
 * against it without importing server-only code.
 */
export interface PublicReef {
  address: string;
  day: number;
  plants: Plant[];
  stakedLuna: number;
  /** The owner's chosen look, so a visited reef looks like theirs. */
  floor: string;
  wall: string;
  fedToday: boolean;
  receivedToday: number;
  receivedLifetime: number;
}
