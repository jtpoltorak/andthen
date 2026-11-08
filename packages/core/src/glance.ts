import { addDays, minutesOf } from './dates';
import type { CheckIn, DayKey, Habit, Routine } from './model';

/**
 * Day at a glance: when each routine really happens, next to when it's planned.
 * Built from the time on each Done and 2-minute check-in (`CheckIn.at`), which
 * check-ins only have from version 1.30.0 on.
 */

/** How many past days the usual times are taken from. */
export const GLANCE_DAYS = 28;
/** Days with a time needed before a routine shows a usual time. */
export const GLANCE_MIN_DAYS = 3;
/** Days with a time needed before a new time is suggested. */
export const GLANCE_SUGGEST_DAYS = 5;
/** How far (minutes) the usual start drifts from the planned time before a new one is suggested. */
export const GLANCE_DRIFT = 20;

export interface GlanceRow {
  routine: Routine;
  /** The planned time, minutes after midnight. */
  planned?: number;
  /** Usual start and end, minutes after midnight, from the last few weeks. */
  usual?: { start: number; end: number; days: number };
  /** Today's timed check-ins, in time order. */
  today: { at: number; kind: 'full' | 'mini' }[];
  /** A better planned time, rounded to 15 minutes, when the usual start has drifted away. */
  suggestion?: number;
}

/** Minutes after midnight as `HH:mm`. */
export function timeOfMinutes(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** A Date's local time as `HH:mm`, for stamping a check-in. */
export function checkInTime(now: Date): string {
  return timeOfMinutes(now.getHours() * 60 + now.getMinutes());
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * One row per active routine that has a planned time, a usual time, or a timed
 * check-in today. Each day's start is its earliest timed check-in for the routine
 * and its end the latest; the usual start and end are the middle values.
 */
export function dayAtAGlance(
  routines: readonly Routine[],
  habits: readonly Habit[],
  checkIns: readonly CheckIn[],
  today: DayKey,
): GlanceRow[] {
  const since = addDays(today, -GLANCE_DAYS);
  const routineOf = new Map(habits.map((h) => [h.id, h.routineId]));
  // routineId -> day -> [earliest, latest]
  const spans = new Map<string, Map<DayKey, [number, number]>>();
  const todays = new Map<string, GlanceRow['today']>();
  for (const c of checkIns) {
    if (c.kind !== 'full' && c.kind !== 'mini') continue;
    const at = minutesOf(c.at);
    const routineId = routineOf.get(c.habitId);
    if (at === undefined || !routineId || c.date < since || c.date > today) continue;
    if (c.date === today) {
      const list = todays.get(routineId) ?? [];
      list.push({ at, kind: c.kind });
      todays.set(routineId, list);
      continue;
    }
    const days = spans.get(routineId) ?? new Map<DayKey, [number, number]>();
    const span = days.get(c.date);
    days.set(c.date, span ? [Math.min(span[0], at), Math.max(span[1], at)] : [at, at]);
    spans.set(routineId, days);
  }

  const rows: GlanceRow[] = [];
  for (const routine of routines) {
    if (routine.archivedOn) continue;
    const row: GlanceRow = {
      routine,
      today: (todays.get(routine.id) ?? []).sort((a, b) => a.at - b.at),
    };
    const planned = minutesOf(routine.usualTime);
    if (planned !== undefined) row.planned = planned;
    const days = [...(spans.get(routine.id)?.values() ?? [])];
    if (days.length >= GLANCE_MIN_DAYS) {
      const start = median(days.map((d) => d[0]));
      const end = Math.max(start, median(days.map((d) => d[1])));
      row.usual = { start, end, days: days.length };
      if (
        planned !== undefined &&
        days.length >= GLANCE_SUGGEST_DAYS &&
        Math.abs(start - planned) >= GLANCE_DRIFT
      ) {
        const rounded = Math.round(start / 15) * 15;
        if (rounded !== planned && rounded < 1440) row.suggestion = rounded;
      }
    }
    if (row.planned !== undefined || row.usual || row.today.length) rows.push(row);
  }
  return rows;
}

/** The hours the timeline covers: at least 6 am to 10 pm, wider when the day needs it. */
export function glanceHours(rows: readonly GlanceRow[]): { from: number; to: number } {
  const times = rows.flatMap((r) => [
    ...(r.planned !== undefined ? [r.planned] : []),
    ...(r.usual ? [r.usual.start, r.usual.end] : []),
    ...r.today.map((t) => t.at),
  ]);
  const from = Math.min(6, ...times.map((t) => Math.floor(t / 60)));
  const to = Math.max(22, ...times.map((t) => Math.floor(t / 60) + 1));
  return { from, to: Math.min(24, to) };
}
