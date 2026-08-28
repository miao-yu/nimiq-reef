import 'server-only';
import { Address, Transaction, TransactionBuilder } from '@nimiq/core';
import { rpc } from './rpc';
import { metaFor } from './registry';

/**
 * Building staking transactions on the server so a browser can stake.
 *
 * The Hub's `signStaking` takes serialised bytes and hands back signed ones —
 * it does not care who built them. Building here rather than in the page is
 * what keeps `@nimiq/core`'s WebAssembly out of a bundle a phone has to parse:
 * the Node build already runs in this process for address derivation.
 *
 * Nimiq Pay needs none of this. It builds, signs and broadcasts by itself.
 */

/**
 * MainAlbatross. Determined by construction rather than from memory — the node
 * reports the network as a name and `TransactionBuilder` wants the number:
 *
 *   new Transaction(…, 24).toPlain().network === 'mainalbatross'
 */
const NETWORK_IDS: Record<string, number> = {
  MainAlbatross: 24,
  TestAlbatross: 5,
  DevAlbatross: 2,
};

/** Nimiq's staking contract, the recipient of every staking transaction. */
const STAKING_CONTRACT = 'NQ77 0000 0000 0000 0000 0000 0000 0000 0001';

export interface BuiltTransaction {
  /** Hex, unsigned, ready for the Hub. */
  raw: string;
  kind: 'create-staker' | 'add-stake';
  value: number;
  delegation: string | null;
  /** Whether the validator has a logo the signing screen can show. */
  delegationLogo: boolean;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function networkId(): Promise<number> {
  const name = await rpc.getNetworkId();
  const id = NETWORK_IDS[name];
  // Refuse rather than guess. A wrong network id produces a transaction the
  // network silently drops, which looks to the user like staking that did
  // nothing at all.
  if (id === undefined) throw new Error(`Unknown Nimiq network: ${name}`);
  return id;
}

/**
 * A transaction that opens a staking position, or adds to an existing one.
 *
 * `validityStartHeight` is the current head. Albatross only accepts a
 * transaction inside a window after that height, so a build is short-lived by
 * design — sign it now or build it again.
 */
export async function buildStakeTransaction(
  sender: string,
  value: number,
  delegation: string | null,
): Promise<BuiltTransaction> {
  const [height, network, staker] = await Promise.all([
    rpc.getBlockNumber(),
    networkId(),
    rpc.getStakerByAddress(sender),
  ]);

  const from = Address.fromString(sender);
  const fee = 0n;

  if (staker) {
    // Already staking. Adding to the position keeps the existing delegation —
    // changing validator is a different transaction and not something to do as
    // a side effect of "add stake".
    const tx = TransactionBuilder.newAddStake(from, from, BigInt(value), fee, height, network);
    return {
      raw: toHex(tx.serialize()),
      kind: 'add-stake',
      value,
      delegation: staker.delegation,
      delegationLogo: Boolean(staker.delegation && (await metaFor(staker.delegation))?.logo),
    };
  }

  if (!delegation) throw new Error('A new staking position needs a validator to delegate to.');
  const tx = TransactionBuilder.newCreateStaker(
    from,
    Address.fromString(delegation),
    BigInt(value),
    fee,
    height,
    network,
  );
  return {
    raw: toHex(tx.serialize()),
    kind: 'create-staker',
    value,
    delegation,
    delegationLogo: Boolean((await metaFor(delegation))?.logo),
  };
}

export type RelayRefusal = 'malformed' | 'wrong-sender' | 'not-staking';

/**
 * Check a signed transaction before broadcasting it.
 *
 * Without this the endpoint is an open relay: anybody could push any signed
 * transaction into the network through us. Reef has no business carrying
 * traffic that is not this user staking, so both facts are checked — the
 * sender is who the session says, and the recipient is the staking contract.
 */
export function inspectSigned(
  hex: string,
  expectedSender: string,
): { ok: true; hash: string } | { ok: false; reason: RelayRefusal } {
  let tx: Transaction;
  try {
    tx = Transaction.deserialize(fromHex(hex));
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  const plain = tx.toPlain();
  const same = (a: string, b: string) =>
    a.replace(/\s+/g, '').toUpperCase() === b.replace(/\s+/g, '').toUpperCase();

  if (!same(plain.sender, expectedSender)) return { ok: false, reason: 'wrong-sender' };
  if (!same(plain.recipient, STAKING_CONTRACT)) return { ok: false, reason: 'not-staking' };
  return { ok: true, hash: tx.hash() };
}
