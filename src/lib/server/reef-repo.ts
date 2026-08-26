import 'server-only';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from './db';
import { addDays, utcDay } from '@/lib/reef/day';
import { handleFor } from '@/lib/reef/handle';
import type { ChargeEvent } from '@/lib/reef/charges';
import type { Plant, SpeciesKey } from '@/lib/reef';

interface ReefRow extends RowDataPacket {
  address: string;
  first_day: Date | string;
  handle: string | null;
  best_streak: number;
  charges_updated_at: Date | null;
}

interface SpecimenRow extends RowDataPacket {
  id: number;
  slot: number | null;
  species: SpeciesKey;
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';
  seed: number;
  discovered_at: Date;
}

interface DayRow extends RowDataPacket {
  day: Date | string;
  staked_luna: number | string;
}

/** MySQL DATE comes back as a Date or a string depending on driver settings. */
function asDay(value: Date | string): string {
  return typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

export interface ReefRecord {
  address: string;
  firstDay: string;
  handle: string;
  bestStreak: number;
  chargesUpdatedAt: Date | null;
}

/** Create the reef on first sight. Idempotent — safe to call on every request. */
export async function ensureReef(address: string): Promise<ReefRecord> {
  const today = utcDay();
  await db().execute(
    `INSERT INTO reefs (address, first_day) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE last_seen_at = CURRENT_TIMESTAMP`,
    [address, today],
  );
  const [rows] = await db().query<ReefRow[]>(
    'SELECT address, first_day, handle, best_streak, charges_updated_at FROM reefs WHERE address = ?',
    [address],
  );
  const row = rows[0];
  if (!row) throw new Error(`Reef missing immediately after insert: ${address}`);

  // Handles are assigned on first read rather than backfilled, so a reef made
  // before they existed simply picks one up next time it is looked at.
  let handle = row.handle ?? '';
  if (!handle) handle = await assignHandle(address);

  return {
    address: row.address,
    firstDay: asDay(row.first_day),
    handle,
    bestStreak: Number(row.best_streak ?? 0),
    chargesUpdatedAt: row.charges_updated_at ? new Date(row.charges_updated_at) : null,
  };
}

/** Retries on the unique key; the name space is large enough that it rarely does. */
async function assignHandle(address: string): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = handleFor(address, attempt);
    try {
      await db().execute('UPDATE reefs SET handle = ? WHERE address = ?', [candidate, address]);
      return candidate;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== 'ER_DUP_ENTRY') throw error;
    }
  }
  throw new Error(`Could not assign a handle for ${address}`);
}

export async function listPlants(address: string): Promise<Plant[]> {
  const [rows] = await db().query<SpecimenRow[]>(
    `SELECT id, slot, species, tier, seed, discovered_at
     FROM specimens WHERE address = ? AND slot IS NOT NULL ORDER BY slot`,
    [address],
  );
  return rows.map((r, i) => ({
    slot: r.slot!,
    // Spread evenly across the tank rather than storing a position, so a reef
    // stays composed however many specimens are on display.
    x: (i + 0.5) / Math.max(1, rows.length),
    species: r.species,
    plantedDay: 1,
    seed: r.seed,
  }));
}

/** Record what the chain said about this address today. Called by the tick. */
export async function recordDay(
  address: string,
  stakedLuna: number,
  delegation: string | null,
): Promise<void> {
  await db().execute(
    `INSERT INTO reef_days (address, day, staked_luna, delegation)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       staked_luna = VALUES(staked_luna),
       delegation  = VALUES(delegation),
       observed_at = CURRENT_TIMESTAMP`,
    [address, utcDay(), stakedLuna, delegation],
  );
}

/**
 * Unbroken days staked, walking back from today.
 *
 * Forgiving by design: a day we never observed neither counts nor breaks the
 * run. Our own tick outage should not reset somebody's streak. A day we *did*
 * observe with nothing staked does break it — that is the user's choice, and
 * the garden pausing is the honest consequence.
 */
export async function daysStaked(address: string, lookback = 400): Promise<number> {
  const [rows] = await db().query<DayRow[]>(
    `SELECT day, staked_luna FROM reef_days
     WHERE address = ? AND day >= ?
     ORDER BY day DESC`,
    [address, addDays(utcDay(), -lookback)],
  );

  const observed = new Map(rows.map((r) => [asDay(r.day), Number(r.staked_luna)]));
  let streak = 0;
  let cursor = utcDay();

  for (let i = 0; i <= lookback; i++) {
    const staked = observed.get(cursor);
    if (staked === undefined) {
      cursor = addDays(cursor, -1);
      continue; // never watched that day; say nothing about it
    }
    if (staked <= 0) break;
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Addresses the tick should look up. Reefs only exist once someone signs in. */
export async function allReefAddresses(): Promise<string[]> {
  const [rows] = await db().query<RowDataPacket[]>('SELECT address FROM reefs');
  return rows.map((r) => r.address as string);
}

export async function recordTick(
  blockNumber: number | null,
  seen: number,
  staked: number,
  error?: string,
): Promise<void> {
  await db().execute(
    'INSERT INTO ticks (block_number, reefs_seen, reefs_staked, error) VALUES (?, ?, ?, ?)',
    [blockNumber, seen, staked, error ?? null],
  );
}

export interface CommunityPlant {
  species: SpeciesKey;
  /** How many days ago it was planted, across every reef. */
  ageDays: number;
  seed: number;
}

export interface CommunitySnapshot {
  plants: CommunityPlant[];
  reefs: number;
  totalPlants: number;
  stakedToday: number;
}

/**
 * Everyone's plants, for the view a first-time visitor lands on.
 *
 * Ages are normalised to "days ago" because each reef counts its own days
 * from its own first day — mixing raw planted_day values across reefs would
 * render a two-day-old sprout as ancient.
 *
 * Deliberately no addresses: this is a garden, not a leaderboard, and nobody
 * consented to having their wallet shown to strangers.
 */
export async function communitySnapshot(limit = 14): Promise<CommunitySnapshot> {
  const [rows] = await db().query<RowDataPacket[]>(
    `SELECT p.species,
            p.seed,
            DATEDIFF(UTC_DATE(), g.first_day) + 1 - p.planted_day AS age_days
     FROM plants p
     JOIN reefs g ON g.address = p.address
     ORDER BY p.planted_at DESC
     LIMIT ?`,
    [limit],
  );

  const [[counts]] = await db().query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM reefs) AS reefs,
       (SELECT COUNT(*) FROM plants) AS total_plants,
       (SELECT COUNT(*) FROM reef_days WHERE day = UTC_DATE() AND staked_luna > 0) AS staked_today`,
  );

  return {
    plants: rows.map((r) => ({
      species: r.species as SpeciesKey,
      ageDays: Math.max(0, Number(r.age_days)),
      seed: Number(r.seed),
    })),
    reefs: Number(counts?.reefs ?? 0),
    totalPlants: Number(counts?.total_plants ?? 0),
    stakedToday: Number(counts?.staked_today ?? 0),
  };
}

/* ------------------------------------------------------------------ *
 * Specimens, charges, feeding — the Step 4 to 7 surface.
 * ------------------------------------------------------------------ */

export interface Specimen {
  id: number;
  species: SpeciesKey;
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';
  seed: number;
  slot: number | null;
  discoveredAt: Date;
}

/** Everything ever discovered, displayed or not. The field guide reads this. */
export async function listSpecimens(address: string): Promise<Specimen[]> {
  const [rows] = await db().query<SpecimenRow[]>(
    `SELECT id, slot, species, tier, seed, discovered_at
     FROM specimens WHERE address = ? ORDER BY discovered_at DESC`,
    [address],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    species: r.species,
    tier: r.tier,
    seed: Number(r.seed),
    slot: r.slot === null ? null : Number(r.slot),
    discoveredAt: new Date(r.discovered_at),
  }));
}

/**
 * Everything that moved the charge balance recently, for the bucket to replay:
 * rolls spend, earned bonuses add.
 *
 * Only the window in which the bucket could still be short matters; anything
 * older has certainly regenerated.
 */
export async function chargeEvents(address: string, sinceEpoch: number): Promise<ChargeEvent[]> {
  const [spends] = await db().query<RowDataPacket[]>(
    'SELECT epoch FROM rolls WHERE address = ? AND epoch > ?',
    [address, sinceEpoch],
  );
  const [grants] = await db().query<RowDataPacket[]>(
    'SELECT epoch FROM bonus_charges WHERE address = ? AND epoch > ?',
    [address, sinceEpoch],
  );
  return [
    ...spends.map((r) => ({ epoch: Number(r.epoch), delta: -1 })),
    ...grants.map((r) => ({ epoch: Number(r.epoch), delta: 1 })),
  ];
}

/**
 * Record the wallet balance and grant a bonus charge if it *fell*.
 *
 * Only decreases count. A validator payout is always an increase, so excluding
 * increases excludes every payout without needing to know who sent what — which
 * we cannot know anyway, since getTransactionsByAddress needs a history index
 * the node does not run.
 *
 * It is also the truer signal: receiving money is somebody else using Nimiq
 * Pay. Sending, or staking, is the deliberate act worth a charge.
 *
 * Compared against the previous *tick* rather than the previous epoch, so a
 * send followed by a receive fifteen minutes later still counts. Both inside a
 * single fifteen-minute window would net out and be missed — a known limit, and
 * a narrow one.
 *
 * The primary key on bonus_charges is the cap: however many times a balance
 * falls in an epoch, exactly one charge is earned.
 */
export async function recordWalletActivity(
  address: string,
  epoch: number,
  balanceLuna: number,
): Promise<boolean> {
  const [rows] = await db().query<RowDataPacket[]>(
    'SELECT last_balance_luna FROM reefs WHERE address = ?',
    [address],
  );
  const previous = rows[0]?.last_balance_luna;
  const before = previous === null || previous === undefined ? null : Number(previous);

  await db().execute('UPDATE reefs SET last_balance_luna = ? WHERE address = ?', [balanceLuna, address]);
  await db().execute(
    `INSERT INTO epoch_activity (address, epoch, balance_luna) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE balance_luna = VALUES(balance_luna), observed_at = CURRENT_TIMESTAMP`,
    [address, epoch, balanceLuna],
  );

  // First sighting establishes a baseline; it is not evidence of anything.
  if (before === null || balanceLuna >= before) return false;

  const [res] = await db().execute<ResultSetHeader>(
    'INSERT IGNORE INTO bonus_charges (address, epoch) VALUES (?, ?)',
    [address, epoch],
  );
  return res.affectedRows === 1;
}

/**
 * Record a roll and the specimen it produced, in one transaction.
 *
 * `charges_updated_at` is stamped on every spend so the derived balance always
 * has a fresh anchor — a stored counter would drift; a timestamp cannot.
 */
export async function recordRoll(
  address: string,
  species: SpeciesKey,
  tier: Specimen['tier'],
  seed: number,
  slot: number | null,
  epoch: number,
  source: 'charge' | 'payment' = 'charge',
): Promise<number> {
  const conn = await db().getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('INSERT INTO rolls (address, source, epoch) VALUES (?, ?, ?)', [
      address,
      source,
      epoch,
    ]);
    const [res] = await conn.execute<ResultSetHeader>(
      'INSERT INTO specimens (address, species, tier, seed, slot) VALUES (?, ?, ?, ?, ?)',
      [address, species, tier, seed, slot],
    );
    await conn.commit();
    return res.insertId;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export type SlotOutcome = 'moved' | 'slot-taken' | 'not-found';

/** Put a specimen on display. UNIQUE (address, slot) is what enforces capacity. */
export async function displaySpecimen(
  address: string,
  id: number,
  slot: number,
): Promise<SlotOutcome> {
  try {
    const [res] = await db().execute<ResultSetHeader>(
      'UPDATE specimens SET slot = ? WHERE id = ? AND address = ?',
      [slot, id, address],
    );
    return res.affectedRows === 1 ? 'moved' : 'not-found';
  } catch (error) {
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') return 'slot-taken';
    throw error;
  }
}

/** Return one to the reef. The row survives — only the display slot clears. */
export async function releaseSpecimen(address: string, id: number): Promise<SlotOutcome> {
  const [res] = await db().execute<ResultSetHeader>(
    'UPDATE specimens SET slot = NULL WHERE id = ? AND address = ?',
    [id, address],
  );
  return res.affectedRows === 1 ? 'moved' : 'not-found';
}

/* ---------------- feeding ---------------- */

export async function fedToday(address: string): Promise<boolean> {
  const [rows] = await db().query<RowDataPacket[]>(
    'SELECT 1 FROM feeds WHERE address = ? AND day = ?',
    [address, utcDay()],
  );
  return rows.length > 0;
}

/** Idempotent per day: feeding twice is not an error, it just does nothing. */
export async function feedOwn(address: string): Promise<void> {
  await db().execute('INSERT IGNORE INTO feeds (address, day) VALUES (?, ?)', [address, utcDay()]);
}

/**
 * Consecutive days fed, walking back from today.
 *
 * Unlike the staking streak this is *not* forgiving of gaps — a missed feed is
 * unambiguous, nobody tapped. Unlocked cosmetics survive it regardless; you
 * lose the number, never the things.
 */
export async function feedStreak(address: string, lookback = 400): Promise<number> {
  const [rows] = await db().query<RowDataPacket[]>(
    'SELECT day FROM feeds WHERE address = ? AND day >= ? ORDER BY day DESC',
    [address, addDays(utcDay(), -lookback)],
  );
  const days = new Set(rows.map((r) => asDay(r.day as Date | string)));
  let streak = 0;
  let cursor = utcDay();
  // Today not yet fed does not break a run that is still alive from yesterday.
  if (!days.has(cursor)) cursor = addDays(cursor, -1);
  while (days.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export async function rememberBestStreak(address: string, streak: number): Promise<void> {
  await db().execute(
    'UPDATE reefs SET best_streak = GREATEST(best_streak, ?) WHERE address = ?',
    [streak, address],
  );
}

/* ---------------- feeding somebody else ---------------- */

export interface FeedCandidate {
  handle: string;
  species: SpeciesKey[];
}

/**
 * Reefs nobody has fed today, weighted toward the quiet ones.
 *
 * Ordered by lifetime feeds received so newcomers get attention rather than
 * the same few reefs collecting everything. Identified by handle — the payload
 * never carries an address.
 */
export async function feedCandidates(
  exclude: string,
  deviceHash: string,
  limit = 3,
): Promise<FeedCandidate[]> {
  const [rows] = await db().query<RowDataPacket[]>(
    `SELECT r.address, r.handle,
            (SELECT COUNT(*) FROM feedings f WHERE f.to_address = r.address) AS received
     FROM reefs r
     WHERE r.address <> ?
       AND r.handle IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM feedings f
         WHERE f.to_address = r.address AND f.day = ? AND f.device_hash = ?
       )
     ORDER BY received ASC, RAND()
     LIMIT ?`,
    [exclude, utcDay(), deviceHash, limit],
  );

  const out: FeedCandidate[] = [];
  for (const row of rows) {
    const [species] = await db().query<RowDataPacket[]>(
      'SELECT DISTINCT species FROM specimens WHERE address = ? AND slot IS NOT NULL LIMIT 6',
      [row.address],
    );
    out.push({
      handle: row.handle as string,
      species: species.map((s) => s.species as SpeciesKey),
    });
  }
  return out;
}

export type FeedOutcome = 'fed' | 'already-fed-today' | 'unknown-reef' | 'own-reef';

/**
 * Feed another reef. One per device per UTC day.
 *
 * The limit is on the device rather than the wallet because a wallet costs
 * nothing to create. UNIQUE (device_hash, day) is what enforces it — a check
 * in application code would lose a race to a double tap.
 */
export async function feedOther(
  fromAddress: string,
  handle: string,
  deviceHash: string,
): Promise<FeedOutcome> {
  const [rows] = await db().query<RowDataPacket[]>(
    'SELECT address FROM reefs WHERE handle = ?',
    [handle],
  );
  const to = rows[0]?.address as string | undefined;
  if (!to) return 'unknown-reef';
  if (to === fromAddress) return 'own-reef';

  try {
    await db().execute(
      'INSERT INTO feedings (from_address, to_address, day, device_hash) VALUES (?, ?, ?, ?)',
      [fromAddress, to, utcDay(), deviceHash],
    );
    return 'fed';
  } catch (error) {
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') return 'already-fed-today';
    throw error;
  }
}

export interface FeedingCounts {
  receivedToday: number;
  receivedLifetime: number;
  givenLifetime: number;
}

export async function feedingCounts(address: string): Promise<FeedingCounts> {
  const [rows] = await db().query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM feedings WHERE to_address = ? AND day = ?) AS received_today,
       (SELECT COUNT(*) FROM feedings WHERE to_address = ?)             AS received_lifetime,
       (SELECT COUNT(*) FROM feedings WHERE from_address = ?)           AS given_lifetime`,
    [address, utcDay(), address, address],
  );
  const r = rows[0];
  return {
    receivedToday: Number(r?.received_today ?? 0),
    receivedLifetime: Number(r?.received_lifetime ?? 0),
    givenLifetime: Number(r?.given_lifetime ?? 0),
  };
}

export async function gaveToday(deviceHash: string): Promise<boolean> {
  const [rows] = await db().query<RowDataPacket[]>(
    'SELECT 1 FROM feedings WHERE device_hash = ? AND day = ?',
    [deviceHash, utcDay()],
  );
  return rows.length > 0;
}


/** The last epoch we saw for a reef, for when the chain cannot be reached. */
export async function lastKnownEpoch(address: string): Promise<number> {
  const [rows] = await db().query<RowDataPacket[]>(
    'SELECT MAX(epoch) AS epoch FROM epoch_activity WHERE address = ?',
    [address],
  );
  return Number(rows[0]?.epoch ?? 0);
}
