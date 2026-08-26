import 'server-only';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from './db';
import { addDays, utcDay } from '@/lib/reef/day';
import type { Plant, SpeciesKey } from '@/lib/reef';

interface ReefRow extends RowDataPacket {
  address: string;
  first_day: Date | string;
  created_at: Date;
}

interface PlantRow extends RowDataPacket {
  plot_index: number;
  species: SpeciesKey;
  planted_day: number;
  seed: number;
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
    'SELECT address, first_day, created_at FROM reefs WHERE address = ?',
    [address],
  );
  const row = rows[0];
  if (!row) throw new Error(`Reef missing immediately after insert: ${address}`);
  return { address: row.address, firstDay: asDay(row.first_day) };
}

export async function listPlants(address: string): Promise<Plant[]> {
  const [rows] = await db().query<PlantRow[]>(
    'SELECT plot_index, species, planted_day, seed FROM plants WHERE address = ? ORDER BY plot_index',
    [address],
  );
  return rows.map((r) => ({
    // Spread plots evenly across the ground rather than storing a position.
    x: (r.plot_index + 0.5) / 4,
    species: r.species,
    plantedDay: r.planted_day,
    seed: r.seed,
  }));
}

export type PlantOutcome = 'planted' | 'plot-taken';

/**
 * Fill a plot. Relies on UNIQUE (address, plot_index) rather than a read-then-
 * write check, so two taps racing each other cannot both plant — the second
 * loses at the database, not at a lucky moment in application code.
 */
export async function plant(
  address: string,
  plotIndex: number,
  species: SpeciesKey,
  plantedDay: number,
  seed: number,
): Promise<PlantOutcome> {
  const [result] = await db().execute<ResultSetHeader>(
    `INSERT IGNORE INTO plants (address, plot_index, species, planted_day, seed)
     VALUES (?, ?, ?, ?, ?)`,
    [address, plotIndex, species, plantedDay, seed],
  );
  return result.affectedRows === 1 ? 'planted' : 'plot-taken';
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
