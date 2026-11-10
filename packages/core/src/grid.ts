import { addDays } from './dates';
import { type DayStatus, dayStatus, habitSpan } from './history';
import { hasJournal } from './journal';
import type { CheckIn, DayKey, Habit, Routine } from './model';
import type { WeekStart } from './preferences';

/**
 * How far back the grid view lets you change a day: today and the 6 days before it.
 * Older days are view-only, so the garden, milestones and weekly reflections keep
 * meaning what they meant at the time.
 */
export const EDITABLE_DAYS = 7;

/** True when a check-in on `day` can still be added, changed or cleared. */
export function canEditDay(day: DayKey, today: DayKey): boolean {
  return day <= today && day > addDays(today, -EDITABLE_DAYS);
}

/** `count` days ending on `last`, oldest first. */
export function gridDays(last: DayKey, count: number): DayKey[] {
  return Array.from({ length: count }, (_, i) => addDays(last, i - count + 1));
}

export interface GridCell {
  date: DayKey;
  status: DayStatus;
  /** Can be changed from the grid: recent enough, and the habit was in its chain that day. */
  editable: boolean;
  /** Has a tiny-journal mood or note. */
  noted: boolean;
}

export interface GridRow {
  habit: Habit;
  cells: GridCell[];
  /** Days done (in full or as 2 minutes) in the span. */
  done: number;
  /** Days the span asked for: everything but rest days, days outside the chain, and today while open. */
  asked: number;
}

export interface GridGroup {
  routine: Routine;
  rows: GridRow[];
}

const isDone = (s: DayStatus) => s === 'full' || s === 'mini';

/**
 * Habits as rows and days as columns, grouped by routine in chain order.
 * A habit shows when it was part of its chain on at least one of `days`,
 * so a habit retired mid-span keeps its recent history. Routines with no such habit are left out.
 * `routines` should already be in display order.
 */
export function habitGrid(
  routines: readonly Routine[],
  habits: readonly Habit[],
  checkIns: ReadonlyMap<string, CheckIn>,
  days: readonly DayKey[],
  today: DayKey,
  weekStartsOn: WeekStart = 1,
): GridGroup[] {
  if (!days.length) return [];
  const first = days[0];
  const last = days[days.length - 1];
  return routines.flatMap((routine) => {
    const rows = habits
      .filter((h) => h.routineId === routine.id)
      .filter((h) => {
        const { from, until } = habitSpan(h, routine);
        return from <= last && (!until || until > first) && (!until || from < until);
      })
      .sort((a, b) => a.order - b.order)
      .map((habit): GridRow => {
        let done = 0;
        let asked = 0;
        const cells = days.map((date): GridCell => {
          const status = dayStatus(habit, routine, checkIns, date, today, weekStartsOn);
          if (isDone(status)) done++;
          if (status === 'full' || status === 'mini' || status === 'skip' || status === 'missed') {
            asked++;
          }
          const checkIn = checkIns.get(`${habit.id}|${date}`);
          return {
            date,
            status,
            editable: status !== 'off' && canEditDay(date, today),
            noted: !!checkIn && hasJournal(checkIn),
          };
        });
        return { habit, cells, done, asked };
      });
    return rows.length ? [{ routine, rows }] : [];
  });
}

/**
 * How much of each day got done across every row: done / asked, or undefined
 * when the day asked for nothing. A day still open counts as asked, so today fills in as you go.
 */
export function gridDayShares(groups: readonly GridGroup[], count: number): (number | undefined)[] {
  const done = new Array<number>(count).fill(0);
  const asked = new Array<number>(count).fill(0);
  for (const { rows } of groups) {
    for (const { cells } of rows) {
      cells.forEach((cell, i) => {
        if (isDone(cell.status)) done[i]++;
        if (cell.status !== 'rest' && cell.status !== 'off') asked[i]++;
      });
    }
  }
  return done.map((d, i) => (asked[i] ? d / asked[i] : undefined));
}
