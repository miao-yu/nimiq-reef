import 'server-only';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from './db';
import { addDays, reefDay, utcDay } from '@/lib/reef/day';
import { stakingStreak, STAKE_LOOKBACK_DAYS } from '@/lib/reef/streak';
import { hotPondFrom } from '@/lib/reef/ponds';
import { isShiny } from '@/lib/tank/traits';
import type { ChargeEvent } from '@/lib/reef/charges';
import type { Plant, SpeciesKey, Tier } from '@/lib/reef';

interface ReefRow extends RowDataPacket {
  address: string;
  first_day: Date | string;
  hidden: number;
  best_streak: number;
  charges_updated_at: Date | null;
}

interface SpecimenRow extends RowDataPacket {
  id: number;
  /** Only selected when listing across several reefs. */
  address?: string;
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

/** Midnight UTC of the day a specimen was discovered. */
function discoveredDay(at: Date | string): number {
  return Date.parse(`${asDay(at)}T00:00:00Z`);
}

/** MySQL DATE comes back as a Date or a string depending on driver settings. */
function asDay(value: Date | string): string {
  return typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

export interface ReefRecord {
  address: string;
  firstDay: string;
  /** Opted out of a public reef page. */
  hidden: boolean;
  bestStreak: number;
  /** Highest staking streak ever reached. What a reef reaches, it keeps. */
  peakStreak: number;
  floor: string;
  wall: string;
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
    `SELECT address, first_day, hidden, best_streak, peak_streak, floor, wall,
            charges_updated_at
     FROM reefs WHERE address = ?`,
    [address],
  );
  const row = rows[0];
  if (!row) throw new Error(`Reef missing immediately after insert: ${address}`);

  return {
    address: row.address,
    firstDay: asDay(row.first_day),
    hidden: Number(row.hidden) === 1,
    bestStreak: Number(row.best_streak ?? 0),
    peakStreak: Number(row.peak_streak ?? 0),
    floor: (row.floor as string) ?? 'sand',
    wall: (row.wall as string) ?? 'open',
    chargesUpdatedAt: row.charges_updated_at ? new Date(row.charges_updated_at) : null,
  };
}

export async function listPlants(address: string): Promise<Plant[]> {
  const [rows] = await db().query<SpecimenRow[]>(
    `SELECT id, slot, species, tier, seed, discovered_at
     FROM specimens WHERE address = ? AND slot IS NOT NULL ORDER BY slot`,
    [address],
  );
  const today = Date.parse(`${utcDay()}T00:00:00Z`);
  return rows.map((r, i) => ({
    slot: r.slot!,
    // Spread evenly across the tank rather than storing a position, so a reef
    // stays composed however many specimens are on display.
    x: (i + 0.5) / Math.max(1, rows.length),
    species: r.species,
    // The rolled tier, not the species default. Dropping it here is what let
    // a common shark wear a legendary's crown.
    tier: r.tier,
    plantedDay: 1,
    ageDays: Math.max(0, Math.round((today - discoveredDay(r.discovered_at)) / 86_400_000)),
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

export async function daysStaked(
  address: string,
  lookback = STAKE_LOOKBACK_DAYS,
): Promise<number> {
  const [rows] = await db().query<DayRow[]>(
    `SELECT day, staked_luna FROM reef_days
     WHERE address = ? AND day >= ?
     ORDER BY day DESC`,
    [address, addDays(utcDay(), -lookback)],
  );
  return stakingStreak(new Map(rows.map((r) => [asDay(r.day), Number(r.staked_luna)])), lookback);
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

/**
 * The species this reef has caught most recently.
 *
 * Feeds the duplicate weighting. Deliberately a short window rather than a
 * lifetime tally: lifetime counts would permanently suppress whatever somebody
 * caught first, while the thing players actually name as the moment fishing
 * becomes a chore is the same fish several times in a row.
 */
export async function recentSpecies(address: string, limit = 8): Promise<SpeciesKey[]> {
  const [rows] = await db().query<RowDataPacket[]>(
    'SELECT species FROM specimens WHERE address = ? ORDER BY discovered_at DESC, id DESC LIMIT ?',
    [address, limit],
  );
  return rows.map((r) => r.species as SpeciesKey);
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
  // Every roll is a charge spent except the epoch's free cast in the hot pond,
  // which produces a specimen without touching the balance.
  const [spends] = await db().query<RowDataPacket[]>(
    "SELECT epoch FROM rolls WHERE address = ? AND epoch > ? AND source <> 'hot'",
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
    'INSERT IGNORE INTO bonus_charges (address, epoch, reason, day) VALUES (?, ?, ?, ?)',
    [address, epoch, 'outgoing', utcDay()],
  );
  return res.affectedRows === 1;
}

/**
 * Being fed grants a charge, at most one a day.
 *
 * The only place somebody else's attendance becomes yours. It stays a nudge
 * rather than a supply: the epoch is still where charges come from, and the
 * unique key on (address, day, reason) is what holds that — a check in
 * application code would lose a race to two people feeding you at once.
 *
 * INSERT IGNORE, so a second feeding is simply not a grant. It is never an
 * error; the feeding itself still counts and still shows in the tank.
 */
export async function grantFedCharge(address: string, epoch: number): Promise<boolean> {
  const [res] = await db().execute<ResultSetHeader>(
    'INSERT IGNORE INTO bonus_charges (address, epoch, reason, day) VALUES (?, ?, ?, ?)',
    [address, epoch, 'fed', utcDay()],
  );
  return res.affectedRows === 1;
}

/**
 * Record a roll and the specimen it produced, in one transaction.
 *
 * `charges_updated_at` is stamped on every spend so the derived balance always
 * has a fresh anchor — a stored counter would drift; a timestamp cannot.
 */
/**
 * A cast that got away.
 *
 * The row in `rolls` is the point: that table is the charge ledger, and
 * chargesFrom replays it. No row means no charge spent, which means a miss
 * costs nothing and the strike window has no stakes.
 */
export async function recordMiss(address: string, epoch: number, pond: string | null): Promise<void> {
  await db().execute('INSERT INTO rolls (address, source, epoch, pond) VALUES (?, ?, ?, ?)', [
    address,
    'miss',
    epoch,
    pond,
  ]);
}

/**
 * Claim the day's free miss, if it is still there.
 *
 * Returns true when this miss was forgiven. The INSERT is the check: the
 * primary key on (address, day) decides it, so two casts landing at once
 * cannot both be forgiven.
 */
export async function claimForgivenMiss(address: string): Promise<boolean> {
  const [res] = await db().execute<ResultSetHeader>(
    'INSERT IGNORE INTO forgiven_misses (address, day) VALUES (?, ?)',
    [address, utcDay()],
  );
  return res.affectedRows === 1;
}

export async function recordRoll(
  address: string,
  species: SpeciesKey,
  tier: Specimen['tier'],
  seed: number,
  slot: number | null,
  epoch: number,
  source: 'charge' | 'payment' | 'hot' = 'charge',
  pond: string | null = null,
): Promise<number> {
  const conn = await db().getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('INSERT INTO rolls (address, source, epoch, pond) VALUES (?, ?, ?, ?)', [
      address,
      source,
      epoch,
      pond,
    ]);
    const [res] = await conn.execute<ResultSetHeader>(
      'INSERT INTO specimens (address, species, tier, seed, slot, pond) VALUES (?, ?, ?, ?, ?, ?)',
      [address, species, tier, seed, slot, pond],
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

/**
 * Raise the high-water mark of the staking streak.
 *
 * GREATEST rather than a read-then-write, so two concurrent requests cannot
 * race one another into lowering it.
 */
/**
 * What a reef has earned the right to show off.
 *
 * Shiny cannot be counted in SQL — it is a function of the seed and tier — so
 * the rows come back and are folded here. Cheap: one indexed scan of a table
 * that holds one row per creature a player has ever caught.
 */
export async function collectionTotals(address: string): Promise<{ species: number; shiny: number }> {
  const [rows] = await db().query<RowDataPacket[]>(
    'SELECT species, tier, seed FROM specimens WHERE address = ?',
    [address],
  );
  const species = new Set<string>();
  let shiny = 0;
  for (const r of rows) {
    species.add(r.species as string);
    if (isShiny(Number(r.seed), r.tier as Tier)) shiny++;
  }
  return { species: species.size, shiny };
}

/** Set the look. Validated by the caller against what the reef has unlocked. */
export async function setLook(address: string, floor: string, wall: string): Promise<void> {
  await db().execute('UPDATE reefs SET floor = ?, wall = ? WHERE address = ?', [
    floor,
    wall,
    address,
  ]);
}

export async function rememberPeakStreak(address: string, streak: number): Promise<void> {
  await db().execute(
    'UPDATE reefs SET peak_streak = GREATEST(peak_streak, ?) WHERE address = ?',
    [streak, address],
  );
}

export async function rememberBestStreak(address: string, streak: number): Promise<void> {
  await db().execute(
    'UPDATE reefs SET best_streak = GREATEST(best_streak, ?) WHERE address = ?',
    [streak, address],
  );
}

export interface PublicReef {
  address: string;
  day: number;
  plants: Plant[];
  stakedLuna: number;
  floor: string;
  wall: string;
  fedToday: boolean;
  receivedToday: number;
  receivedLifetime: number;
}

/**
 * What anybody may see about a reef.
 *
 * Reads only what is already stored — no RPC. A card should not cost a chain
 * lookup, and the last observed stake is accurate to within one tick, which is
 * far better than the page needs.
 *
 * Returns null for a reef that does not exist *and* for one whose owner opted
 * out, so a hidden reef is indistinguishable from an absent one.
 */
export async function publicReef(address: string): Promise<PublicReef | null> {
  const [rows] = await db().query<RowDataPacket[]>(
    'SELECT address, first_day, hidden, floor, wall FROM reefs WHERE address = ?',
    [address],
  );
  const row = rows[0];
  if (!row || Number(row.hidden) === 1) return null;

  const [stakeRows] = await db().query<RowDataPacket[]>(
    'SELECT staked_luna FROM reef_days WHERE address = ? ORDER BY day DESC LIMIT 1',
    [address],
  );
  const [plants, counts, fed] = await Promise.all([
    listPlants(address),
    feedingCounts(address),
    fedToday(address),
  ]);

  return {
    address: row.address as string,
    day: reefDay(asDay(row.first_day)),
    plants,
    stakedLuna: Number(stakeRows[0]?.staked_luna ?? 0),
    floor: (row.floor as string) ?? 'sand',
    wall: (row.wall as string) ?? 'open',
    fedToday: fed,
    receivedToday: counts.receivedToday,
    receivedLifetime: counts.receivedLifetime,
  };
}

/**
 * A cursor is the sort value plus the address that broke its tie.
 *
 * Opaque on purpose: it is a position in a result set, not an address, and
 * encoding it stops a caller building one by hand and getting a page that
 * quietly skips rows.
 */
interface Cursor {
  /** Dates travel as 'YYYY-MM-DD', where lexical order is chronological. */
  value: number | string;
  address: string;
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

function decodeCursor(raw: string | null | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString()) as Partial<Cursor>;
    const value = parsed.value;
    const ok =
      (typeof value === 'number' && Number.isFinite(value)) || typeof value === 'string';
    if (!ok) return null;
    if (typeof parsed.address !== 'string') return null;
    return { value: value as number | string, address: parsed.address };
  } catch {
    // A cursor we cannot read means the first page, not a crash.
    return null;
  }
}

export type CommunitySort = 'new' | 'species' | 'quiet';

export interface CommunityReef {
  address: string;
  day: number;
  species: number;
  stakedLuna: number;
  delegation: string | null;
  fedLifetime: number;
  plants: Plant[];
}

export interface CommunityPage {
  reefs: CommunityReef[];
  /** Pass back as `cursor` for the next page, or null at the end. */
  next: string | null;
}

/**
 * A page of public reefs.
 *
 * Two queries regardless of page size: one for the reefs, one for every
 * inhabitant of the reefs on that page. Per-reef queries would be a dozen
 * round trips to draw one screen.
 *
 * Keyset pagination rather than OFFSET, because reefs are created while
 * somebody is scrolling and an offset page silently skips or repeats rows when
 * the set shifts underneath it.
 *
 * The cursor carries the sort value as well as the address. Comparing address
 * alone — which this did — is not "the row after that one" in a list ordered
 * by anything else: it drops every reef whose address sorts lower regardless
 * of its position, so page two silently lost rows. Ties made it worse, and
 * days staked is a small integer that is nearly all ties.
 */
export async function communityReefs(options: {
  sort?: CommunitySort;
  pool?: string | null;
  cursor?: string | null;
  limit?: number;
}): Promise<CommunityPage> {
  const sort: CommunitySort = options.sort ?? 'species';
  const limit = Math.min(48, Math.max(1, options.limit ?? 12));

  /*
   * Whitelisted rather than interpolated: these strings go straight into SQL.
   *
   * `column` is the alias the sort leads on and `desc` its direction; both the
   * ORDER BY and the cursor comparison are built from them, so the two cannot
   * drift apart. Every sort still breaks ties on address, which is what makes
   * a row's position unique and the cursor exact.
   */
  const ORDER: Record<CommunitySort, { column: string; desc: boolean }> = {
    // Not r.first_day: the driver hands a DATE back as a Date object, which
    // does not survive a round trip through the cursor as a number.
    new: { column: 'first_day_key', desc: true },
    species: { column: 'species', desc: true },
    quiet: { column: 'fed_lifetime', desc: false },
  };
  const { column, desc } = ORDER[sort];


  const where: string[] = ['r.hidden = 0'];
  const params: unknown[] = [];
  if (options.pool) {
    where.push('d.delegation = ?');
    params.push(options.pool);
  }

  // Aliases are not visible to WHERE in MySQL, but they are to HAVING — and
  // with no aggregate in the query HAVING filters row by row, which is what
  // this needs.
  const having: string[] = [];
  const havingParams: unknown[] = [];
  const from = decodeCursor(options.cursor);
  if (from) {
    having.push(`(${column} ${desc ? '<' : '>'} ? OR (${column} = ? AND r.address > ?))`);
    havingParams.push(from.value, from.value, from.address);
  }

  const [rows] = await db().query<RowDataPacket[]>(
    `SELECT r.address, r.first_day AS first_day,
            DATE_FORMAT(r.first_day, '%Y-%m-%d') AS first_day_key,
            d.staked_luna, d.delegation,
            (SELECT COUNT(DISTINCT s.species) FROM specimens s WHERE s.address = r.address) AS species,
            (SELECT COUNT(*) FROM feedings f WHERE f.to_address = r.address) AS fed_lifetime
     FROM reefs r
     LEFT JOIN reef_days d
       ON d.address = r.address
      AND d.day = (SELECT MAX(day) FROM reef_days x WHERE x.address = r.address)
     WHERE ${where.join(' AND ')}
     ${having.length ? `HAVING ${having.join(' AND ')}` : ''}
     ORDER BY ${column} ${desc ? 'DESC' : 'ASC'}, r.address ASC
     LIMIT ?`,
    [...params, ...havingParams, limit + 1],
  );

  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  const next =
    rows.length > limit && last
      ? encodeCursor({
          value: typeof last[column] === 'string' ? (last[column] as string) : Number(last[column]),
          address: last.address as string,
        })
      : null;
  if (page.length === 0) return { reefs: [], next: null };

  const addresses = page.map((r) => r.address as string);
  const [specimens] = await db().query<SpecimenRow[]>(
    `SELECT address, id, slot, species, tier, seed, discovered_at
     FROM specimens
     WHERE address IN (${addresses.map(() => '?').join(',')}) AND slot IS NOT NULL
     ORDER BY address, slot`,
    addresses,
  );

  const today = Date.parse(`${utcDay()}T00:00:00Z`);
  const byAddress = new Map<string, Plant[]>();
  for (const row of specimens) {
    const key = row.address as string;
    const list = byAddress.get(key) ?? [];
    list.push({
      slot: row.slot!,
      x: 0,
      species: row.species,
      tier: row.tier,
      plantedDay: 1,
      ageDays: Math.max(0, Math.round((today - discoveredDay(row.discovered_at)) / 86_400_000)),
      seed: row.seed,
    });
    byAddress.set(key, list);
  }

  return {
    next,
    reefs: page.map((r) => {
      const plants = byAddress.get(r.address as string) ?? [];
      return {
        address: r.address as string,
        day: reefDay(asDay(r.first_day)),
        species: Number(r.species ?? 0),
        stakedLuna: Number(r.staked_luna ?? 0),
        delegation: (r.delegation as string | null) ?? null,
        fedLifetime: Number(r.fed_lifetime ?? 0),
        // Spread across the tank on read, exactly as listPlants does.
        plants: plants.map((p, i) => ({ ...p, x: (i + 0.5) / Math.max(1, plants.length) })),
      };
    }),
  };
}

/**
 * Hide or show a reef on its public page.
 *
 * Reachable only through /api/reef/visibility, which no UI currently calls —
 * see the note there. Every reef is visible by default and none are hidden.
 */
export async function setHidden(address: string, hidden: boolean): Promise<void> {
  await db().execute('UPDATE reefs SET hidden = ? WHERE address = ?', [hidden ? 1 : 0, address]);
}

/* ---------------- feeding somebody else ---------------- */

export interface FeedCandidate {
  address: string;
  species: SpeciesKey[];
}

/**
 * Reefs nobody has fed today, weighted toward the quiet ones.
 *
 * Ordered by lifetime feeds received so newcomers get attention rather than
 * the same few reefs collecting everything.
 *
 * The payload carries addresses. That is deliberate: stake, delegation and
 * staking history are readable from any Nimiq node for any address, so a reef
 * discloses nothing a block explorer does not already show — and the address is
 * what draws the identicon people actually recognise.
 */
export async function feedCandidates(exclude: string, limit = 3): Promise<FeedCandidate[]> {
  const [rows] = await db().query<RowDataPacket[]>(
    `SELECT r.address,
            (SELECT COUNT(*) FROM feedings f WHERE f.to_address = r.address) AS received
     FROM reefs r
     WHERE r.address <> ?
       AND r.hidden = 0
       AND NOT EXISTS (
         SELECT 1 FROM feedings f
         WHERE f.to_address = r.address AND f.day = ? AND f.from_address = ?
       )
     ORDER BY received ASC, RAND()
     LIMIT ?`,
    [exclude, utcDay(), exclude, limit],
  );

  const out: FeedCandidate[] = [];
  for (const row of rows) {
    const [species] = await db().query<RowDataPacket[]>(
      'SELECT DISTINCT species FROM specimens WHERE address = ? AND slot IS NOT NULL LIMIT 6',
      [row.address],
    );
    out.push({
      address: row.address as string,
      species: species.map((s) => s.species as SpeciesKey),
    });
  }
  return out;
}

export type FeedOutcome = 'fed' | 'already-fed-today' | 'unknown-reef' | 'own-reef';

/**
 * Feed another reef. One per wallet per UTC day.
 *
 * UNIQUE (from_address, day) is what enforces it — a check in application code
 * would lose a race to a double tap.
 */
export async function feedOther(fromAddress: string, toAddress: string): Promise<FeedOutcome> {
  const [rows] = await db().query<RowDataPacket[]>(
    'SELECT address FROM reefs WHERE address = ?',
    [toAddress],
  );
  const to = rows[0]?.address as string | undefined;
  if (!to) return 'unknown-reef';
  if (to === fromAddress) return 'own-reef';

  try {
    await db().execute(
      'INSERT INTO feedings (from_address, to_address, day) VALUES (?, ?, ?)',
      [fromAddress, to, utcDay()],
    );
    return 'fed';
  } catch (error) {
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') return 'already-fed-today';
    throw error;
  }
}

/**
 * Has this address already spent today's gift?
 *
 * The same key the database enforces, so a grey button and a refusal now
 * always agree. They did not while the limit rode on the device: a session
 * knows who you are but not what you are holding.
 */
export async function fedOtherToday(address: string): Promise<boolean> {
  const [rows] = await db().query<RowDataPacket[]>(
    'SELECT 1 FROM feedings WHERE from_address = ? AND day = ? LIMIT 1',
    [address, utcDay()],
  );
  return rows.length > 0;
}

/**
 * The pond running this epoch, pinned on first use.
 *
 * INSERT IGNORE then re-read, so two requests arriving in the same millisecond
 * of a fresh epoch cannot pick different ponds — the loser of the race reads
 * the winner's row rather than its own answer.
 */
export async function pinHotPond(epoch: number, candidates: readonly string[]): Promise<string | null> {
  const [existing] = await db().query<RowDataPacket[]>(
    'SELECT pond FROM hot_ponds WHERE epoch = ?',
    [epoch],
  );
  if (existing[0]) return existing[0].pond as string;

  const choice = hotPondFrom(epoch, candidates);
  if (!choice) return null;
  await db().execute('INSERT IGNORE INTO hot_ponds (epoch, pond) VALUES (?, ?)', [epoch, choice]);

  const [settled] = await db().query<RowDataPacket[]>(
    'SELECT pond FROM hot_ponds WHERE epoch = ?',
    [epoch],
  );
  return (settled[0]?.pond as string) ?? choice;
}

/** The pinned hot pond, or null if this epoch has not been pinned yet. */
export async function hotPondOf(epoch: number): Promise<string | null> {
  const [rows] = await db().query<RowDataPacket[]>(
    'SELECT pond FROM hot_ponds WHERE epoch = ?',
    [epoch],
  );
  return (rows[0]?.pond as string) ?? null;
}

/** Has this reef already taken its free cast this epoch? */
export async function hotCastSpent(address: string, epoch: number): Promise<boolean> {
  const [rows] = await db().query<RowDataPacket[]>(
    'SELECT 1 FROM hot_casts WHERE address = ? AND epoch = ? LIMIT 1',
    [address, epoch],
  );
  return rows.length > 0;
}

/**
 * Claim the free cast. False if it was already taken.
 *
 * The unique key decides, not a read-then-write — a double tap would win that
 * race and spend the epoch's bonus twice.
 */
export async function claimHotCast(address: string, epoch: number): Promise<boolean> {
  try {
    await db().execute('INSERT INTO hot_casts (address, epoch) VALUES (?, ?)', [address, epoch]);
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') return false;
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



/** The last epoch we saw for a reef, for when the chain cannot be reached. */
export async function lastKnownEpoch(address: string): Promise<number> {
  const [rows] = await db().query<RowDataPacket[]>(
    'SELECT MAX(epoch) AS epoch FROM epoch_activity WHERE address = ?',
    [address],
  );
  return Number(rows[0]?.epoch ?? 0);
}
