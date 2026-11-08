import { addDays, fromDayKey } from './dates';
import { dayStatus } from './history';
import type { CheckIn, DayKey, Habit, Routine } from './model';
import type { WeekStart } from './preferences';

/**
 * One day in the year view.
 * - `future`: hasn't happened yet.
 * - `none`: no habit was around that day.
 * - `rest`: habits were around, but none was asked for (rest days, pauses, skips only).
 * - `day`: at least one habit was asked for or done; `level` says how much was done.
 */
export interface YearDay {
  day: DayKey;
  kind: 'future' | 'none' | 'rest' | 'day';
  /** Habits asked for that day: done, or not done. Skips and rest days don't count. */
  asked: number;
  /** Habits done that day, in full or as the 2-minute version. */
  done: number;
  /** 0 = nothing done, 1 = some, 2 = most, 3 = all of it. Set when `kind` is `day`. */
  level?: 0 | 1 | 2 | 3;
}

export interface YearMonth {
  /** The first day of the month. */
  first: DayKey;
  /** Blank cells before the 1st, so the 1st lands under its weekday. */
  lead: number;
  days: YearDay[];
  /** Days with at least one habit done. */
  showedUp: number;
  /** Days that asked for something, so far. */
  daysAsked: number;
}

export interface YearView {
  months: YearMonth[];
  showedUp: number;
  /** Done and 2-minute check-ins in the whole range. */
  checkIns: number;
  /** The month with the most days showed up, once any day has been. */
  bestMonth?: DayKey;
}

/** First day of the month `months` months away from the month holding `day`. */
export function addMonths(day: DayKey, months: number): DayKey {
  const [y, m] = day.split('-').map(Number);
  const index = y * 12 + (m - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

/** How full a day was: all of it, most (half or more), some, or none. */
export function dayLevel(done: number, asked: number): 0 | 1 | 2 | 3 {
  if (done <= 0) return 0;
  if (done >= asked) return 3;
  return done / asked >= 0.5 ? 2 : 1;
}

/**
 * The last `months` months, ending with this one, one calendar per month.
 * Each day is shaded by how much of what it asked for got done. Skips, rest days and
 * paused days are never held against anyone, and today counts only what's done so far.
 * Pass the habits to include (all of them, or one routine's), retired ones too.
 */
export function yearView(
  routines: readonly Routine[],
  habits: readonly Habit[],
  checkIns: ReadonlyMap<string, CheckIn>,
  today: DayKey,
  weekStartsOn: WeekStart = 1,
  months = 12,
): YearView {
  const byId = new Map(routines.map((r) => [r.id, r]));
  const list = habits.map((h) => ({ habit: h, routine: byId.get(h.routineId) }));
  const firstMonth = addMonths(today, -(months - 1));
  const result: YearMonth[] = [];
  let showedUp = 0;
  let total = 0;
  let best: { first: DayKey; days: number } | undefined;

  for (let i = 0; i < months; i++) {
    const first = addMonths(firstMonth, i);
    const next = addMonths(first, 1);
    const month: YearMonth = {
      first,
      lead: (fromDayKey(first).getDay() - weekStartsOn + 7) % 7,
      days: [],
      showedUp: 0,
      daysAsked: 0,
    };
    for (let d = first; d < next; d = addDays(d, 1)) {
      month.days.push(yearDay(d));
    }
    result.push(month);
    showedUp += month.showedUp;
    if (month.showedUp > 0 && (!best || month.showedUp > best.days)) {
      best = { first, days: month.showedUp };
    }

    function yearDay(day: DayKey): YearDay {
      if (day > today) return { day, kind: 'future', asked: 0, done: 0 };
      let asked = 0;
      let done = 0;
      let around = false;
      for (const { habit, routine } of list) {
        const status = dayStatus(habit, routine, checkIns, day, today, weekStartsOn);
        if (status === 'off') continue;
        around = true;
        if (status === 'full' || status === 'mini') {
          done++;
          asked++;
        } else if (status === 'missed') asked++;
      }
      total += done;
      if (done > 0) month.showedUp++;
      if (!around) return { day, kind: 'none', asked, done };
      if (asked === 0) return { day, kind: 'rest', asked, done };
      // Today isn't over: only what's done counts so far.
      if (day === today && done === 0) return { day, kind: 'rest', asked, done };
      month.daysAsked++;
      return { day, kind: 'day', asked, done, level: dayLevel(done, asked) };
    }
  }

  const view: YearView = { months: result, showedUp, checkIns: total };
  if (best) view.bestMonth = best.first;
  return view;
}
