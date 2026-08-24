import 'server-only';
import { PublicKey, Signature } from '@nimiq/core';
import { candidateDigests } from './signed-message';

export interface VerifyInput {
  /** The exact string handed to nimiq.sign(). */
  message: string;
  publicKeyHex: string;
  signatureHex: string;
  /** The address the client says it is. Never trust this on its own. */
  claimedAddress: string;
}

export type VerifyResult =
  | { ok: true; address: string; encoding: string }
  | { ok: false; reason: 'malformed' | 'bad-signature' | 'address-mismatch' };

/** Nimiq addresses are compared in their canonical spaced uppercase form. */
function normalize(address: string): string {
  return address.replace(/\s+/g, '').toUpperCase();
}

/**
 * Verify wallet ownership. Both halves are mandatory:
 *
 *   1. the signature is valid for the supplied public key, AND
 *   2. that public key derives to the address being claimed.
 *
 * Checking only (1) lets an attacker sign the challenge with their own key,
 * claim someone else's address, and inherit that grove. Verified against
 * @nimiq/core 2.20.0 — a foreign key passes (1) and fails (2).
 */
export function verifyWalletSignature(input: VerifyInput): VerifyResult {
  let publicKey: PublicKey;
  let signature: Signature;
  try {
    publicKey = PublicKey.fromHex(input.publicKeyHex);
    signature = Signature.fromHex(input.signatureHex);
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  const match = candidateDigests(input.message).find((candidate) =>
    publicKey.verify(signature, candidate.bytes),
  );
  if (!match) return { ok: false, reason: 'bad-signature' };

  const derived = publicKey.toAddress().toUserFriendlyAddress();
  if (normalize(derived) !== normalize(input.claimedAddress)) {
    return { ok: false, reason: 'address-mismatch' };
  }

  return { ok: true, address: derived, encoding: match.label };
}
