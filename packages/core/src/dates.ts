import type { DayKey } from './model';

const pad = (n: number) => String(n).padStart(2, '0');

/** The local calendar day for a Date, as `YYYY-MM-DD`. */
export function toDayKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses a DayKey as local midnight. */
export function fromDayKey(day: DayKey): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Shifts a DayKey by whole days (negative goes back). Safe across DST changes. */
export function addDays(day: DayKey, days: number): DayKey {
  const date = fromDayKey(day);
  date.setDate(date.getDate() + days);
  return toDayKey(date);
}

/** Minutes since local midnight for an `HH:mm` string, or undefined if malformed. */
export function minutesOf(time: string | undefined): number | undefined {
  if (!time) return undefined;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return undefined;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return undefined;
  return h * 60 + m;
}
