import { ValidationUtils } from '@nimiq/utils/validation-utils';

/** Canonical form for storage and comparison: spaced, uppercase. */
export function normalizeAddress(address: string): string {
  return address.trim().toUpperCase();
}

export function isValidAddress(address: string): boolean {
  return ValidationUtils.isValidAddress(address);
}
