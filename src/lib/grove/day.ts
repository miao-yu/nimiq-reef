/** UTC day arithmetic. Groves tick on UTC days so every player shares a clock. */

const MS_PER_DAY = 86_400_000;

/** 'YYYY-MM-DD' in UTC. */
export function utcDay(at: Date = new Date()): string {
  return at.toISOString().slice(0, 10);
}

export function daysBetween(fromDay: string, toDay: string): number {
  return Math.round((Date.parse(`${toDay}T00:00:00Z`) - Date.parse(`${fromDay}T00:00:00Z`)) / MS_PER_DAY);
}

export function addDays(day: string, delta: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + delta * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Grove day index: the day a grove was created is day 1, not day 0. */
export function groveDay(firstDay: string, at: Date = new Date()): number {
  return daysBetween(firstDay, utcDay(at)) + 1;
}
