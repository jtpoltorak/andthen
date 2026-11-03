import { fromDayKey } from './dates';
import type { DayKey, Schedule } from './model';

/** Monday to Friday, as `Date.getDay()` numbers. */
export const WEEKDAYS: readonly number[] = [1, 2, 3, 4, 5];

/** The most a weekly habit can ask for. Seven is just "every day". */
export const MAX_TIMES_A_WEEK = 6;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** True when a habit with this schedule is planned for this weekday. Weekly habits can happen any day. */
export function isPlannedDay(schedule: Schedule | undefined, day: DayKey): boolean {
  if (schedule?.kind !== 'days') return true;
  return schedule.days.includes(fromDayKey(day).getDay());
}

/** How many times a week a weekly habit is aiming for, or undefined for any other schedule. */
export function weeklyTarget(schedule: Schedule | undefined): number | undefined {
  return schedule?.kind === 'weekly' ? schedule.times : undefined;
}

/**
 * Tidies a schedule: sorted unique days, a whole number of times in range.
 * Returns undefined for "every day" (all seven days, or no schedule).
 */
export function normalizeSchedule(schedule: Schedule | undefined): Schedule | undefined {
  if (!schedule) return undefined;
  if (schedule.kind === 'weekly') {
    const times = Math.round(schedule.times);
    if (!Number.isFinite(times) || times < 1) return undefined;
    return times >= 7 ? undefined : { kind: 'weekly', times: Math.min(times, MAX_TIMES_A_WEEK) };
  }
  const days = [...new Set(schedule.days)]
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    .sort((a, b) => a - b);
  if (days.length === 0 || days.length === 7) return undefined;
  return { kind: 'days', days };
}

/** Short words for a schedule: "Every day", "Weekdays", "Mon, Wed, Fri", "3 times a week". */
export function describeSchedule(schedule: Schedule | undefined): string {
  const clean = normalizeSchedule(schedule);
  if (!clean) return 'Every day';
  if (clean.kind === 'weekly') {
    return clean.times === 1 ? 'Once a week' : `${clean.times} times a week`;
  }
  if (clean.days.join() === WEEKDAYS.join()) return 'Weekdays';
  if (clean.days.join() === '0,6') return 'Weekends';
  // Monday first reads more naturally.
  const ordered = [...clean.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  return ordered.map((d) => DAY_NAMES[d]).join(', ');
}

/** Reads a schedule from stored data. Returns undefined for "every day", or null if it's not valid. */
export function parseSchedule(raw: unknown): Schedule | undefined | null {
  if (raw === undefined) return undefined;
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r['kind'] === 'weekly') {
    const times = r['times'];
    if (typeof times !== 'number' || !Number.isInteger(times) || times < 1 || times > 7)
      return null;
    return normalizeSchedule({ kind: 'weekly', times });
  }
  if (r['kind'] === 'days') {
    const days = r['days'];
    if (!Array.isArray(days) || !days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
      return null;
    }
    if (days.length === 0) return null;
    return normalizeSchedule({ kind: 'days', days: days as number[] });
  }
  return null;
}
