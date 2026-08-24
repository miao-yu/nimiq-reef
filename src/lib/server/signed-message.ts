import 'server-only';
import { createHash } from 'node:crypto';

/**
 * The bytes a Nimiq wallet actually signs.
 *
 * Confirmed on a real device 24 Aug 2026: Nimiq Pay signs
 *
 *   SHA-256( "\x16Nimiq Signed Message:\n" + byteLength + message )
 *
 * which is the same framing the Nimiq Hub uses (`HubApi.MSG_PREFIX`). The
 * verifier previously accepted a raw-UTF-8 variant as well while this was
 * unknown; that alternative is gone, because accepting more encodings than the
 * wallets produce only widens what an attacker can feed us.
 */

const MSG_PREFIX = '\x16Nimiq Signed Message:\n';

export function signedMessageDigest(message: string): Uint8Array {
  const utf8 = Buffer.from(message, 'utf8');
  const framed = Buffer.concat([
    Buffer.from(MSG_PREFIX, 'utf8'),
    Buffer.from(String(utf8.length), 'utf8'),
    utf8,
  ]);
  return new Uint8Array(createHash('sha256').update(framed).digest());
}
