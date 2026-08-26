/**
 * Addresses as identity.
 *
 * Reef has no usernames. The address *is* the handle: it is already public on
 * chain, it is what the Nimiq Wallet shows, and the identicon drawn from it is
 * a face people recognise. Everything social keys on the compact form; the
 * spaced form is for reading.
 */

/** Nimiq's base32 alphabet — the full set minus I, O, W and Z. */
const ALPHABET = /^[0-9A-HJ-NP-VXY]+$/;

/** Compact: NQ, two check digits, 32 base32 characters. No spaces. */
export type CompactAddress = string;

/**
 * Strip formatting and validate, returning the compact form or null.
 *
 * Checks the IBAN-style mod-97 checksum, not just the shape. A typo in a
 * shared link should fail here rather than turn into a 404 that reads like the
 * reef does not exist.
 */
export function normalizeAddress(input: unknown): CompactAddress | null {
  if (typeof input !== 'string') return null;
  const compact = input.replace(/\s+/g, '').toUpperCase();
  if (compact.length !== 36 || !compact.startsWith('NQ')) return null;
  if (!ALPHABET.test(compact.slice(2))) return null;
  return checksum(compact) === 1 ? compact : null;
}

/** Rotate the first four characters to the end, then mod 97 over the digits. */
function checksum(compact: string): number {
  const rotated = compact.slice(4) + compact.slice(0, 4);
  let remainder = 0;
  for (const char of rotated) {
    const value = char >= '0' && char <= '9' ? char : String(char.charCodeAt(0) - 55);
    // Chunked to stay inside a safe integer; the whole number is 40+ digits.
    for (const digit of value) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder;
}

/** The spaced form the wallet displays: NQ64 8DF3 301V … */
export function formatAddress(address: string): string {
  const compact = address.replace(/\s+/g, '').toUpperCase();
  return compact.replace(/.{4}/g, '$& ').trim();
}

/**
 * Short enough for a button, long enough to tell two reefs apart.
 *
 * U+22EF, the midline ellipsis. The usual U+2026 sits on the baseline and
 * reads as dropped between two rows of capitals and digits.
 */
export function truncateAddress(address: string): string {
  const groups = formatAddress(address).split(' ');
  return groups.length > 4
    ? `${groups.slice(0, 2).join(' ')} ⋯ ${groups.slice(-2).join(' ')}`
    : formatAddress(address);
}
