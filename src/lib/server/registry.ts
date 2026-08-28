import 'server-only';

/**
 * The public validator registry: real names, logos and websites.
 *
 * Same source nimiq-cafe uses. The chain carries none of this — only keys,
 * balance and staker counts — so anything human-readable about a validator has
 * to come from here.
 *
 * **It covers roughly half the elected set.** Every caller must have a fallback,
 * which is why ponds keep their identicon and hashed name: those work for all
 * 37, this works for the ~19 that registered.
 *
 * The payload is about 1.4MB because every logo is inlined as a data URI —
 * median 24KB, largest 361KB — so it is fetched once per process and held, and
 * logos are served individually rather than shipped to the client in bulk.
 */

const REGISTRY_URL = 'https://validators-api-mainnet.pages.dev/api/v1/validators';
const TTL_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 8000;

export interface ValidatorMeta {
  address: string;
  name: string;
  website: string | null;
  logo: string | null;
  /**
   * A pool takes other people's stake and pays them for it.
   *
   * `payoutType` is the only field that separates one from a solo or private
   * validator: `isListed`, `isMaintainedByNimiq` and `hasDefaultLogo` are
   * uniform across every entry and say nothing. `restake` and `direct` are
   * both payouts; `none` is a validator that keeps what it earns — measured
   * against the live registry, that is Private Whalidator and Nimiq Surf.
   *
   * Anything absent from the registry is not a pool either: those are the
   * solo nodes, a median of five stakers each.
   */
  isPool: boolean;
}

let cache: { at: number; byAddress: Map<string, ValidatorMeta> } | undefined;
let inFlight: Promise<Map<string, ValidatorMeta>> | undefined;

const key = (address: string) => address.replace(/\s+/g, '').toUpperCase();

async function load(): Promise<Map<string, ValidatorMeta>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // The documented host 302s to a worker; without redirect following this
    // silently parses an empty body.
    const res = await fetch(REGISTRY_URL, { redirect: 'follow', signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body: unknown = await res.json();
    const rows = Array.isArray(body) ? body : [];
    if (rows.length === 0) throw new Error('empty registry');

    const byAddress = new Map<string, ValidatorMeta>();
    for (const row of rows as Record<string, unknown>[]) {
      const address = typeof row.address === 'string' ? row.address : null;
      const name = typeof row.name === 'string' ? row.name : null;
      if (!address || !name) continue;
      const payout = typeof row.payoutType === 'string' ? row.payoutType : null;
      byAddress.set(key(address), {
        address,
        name,
        website: typeof row.website === 'string' ? row.website : null,
        logo: typeof row.logo === 'string' ? row.logo : null,
        isPool: payout !== null && payout !== 'none',
      });
    }
    return byAddress;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Never throws. A registry outage must degrade to identicons and hashed pond
 * names, not take the pond list down with it — the game does not depend on it.
 * A stale map is preferred over an empty one for the same reason.
 */
export async function registry(): Promise<Map<string, ValidatorMeta>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.byAddress;
  inFlight ??= load()
    .then((byAddress) => {
      cache = { at: Date.now(), byAddress };
      return byAddress;
    })
    .catch(() => cache?.byAddress ?? new Map<string, ValidatorMeta>())
    .finally(() => {
      inFlight = undefined;
    });
  return inFlight;
}

export async function metaFor(address: string): Promise<ValidatorMeta | null> {
  return (await registry()).get(key(address)) ?? null;
}

/** A logo decoded from its data URI, or null. */
export async function logoFor(
  address: string,
): Promise<{ mime: string; bytes: Buffer } | null> {
  const meta = await metaFor(address);
  const match = /^data:([\w/+.-]+);base64,(.+)$/.exec(meta?.logo ?? '');
  if (!match) return null;
  return { mime: match[1]!, bytes: Buffer.from(match[2]!, 'base64') };
}
