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
  daysStaked: number;
  fedToday: boolean;
  receivedToday: number;
  receivedLifetime: number;
}
