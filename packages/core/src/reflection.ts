import { addDays } from './dates';
import { dayStatus, habitSpan, weekStart } from './history';
import type { CheckIn, DayKey, Habit, Reflection, Routine } from './model';
import type { WeekStart } from './preferences';

/** Longest note we keep for "what went well" and "what to tweak". */
export const MAX_REFLECTION_LENGTH = 280;

/** The week a reflection is about: its first and last day. */
export interface ReflectionWeek {
  from: DayKey;
  to: DayKey;
}

/**
 * The week to reflect on today. On the first day of a week it's the week that
 * just ended (so a missed Sunday check-in can still happen on Monday);
 * any other day it's the current week.
 */
export function reflectionWeek(today: DayKey, startsOn: WeekStart = 1): ReflectionWeek {
  const thisWeek = weekStart(today, startsOn);
  const from = thisWeek === today ? addDays(thisWeek, -7) : thisWeek;
  return { from, to: addDays(from, 6) };
}

/**
 * Today asks for a reflection on the last day of the week (Sunday, by default)
 * and, as a grace day, on the first day of the next one.
 */
export function isReflectionDay(today: DayKey, startsOn: WeekStart = 1): boolean {
  const { to } = reflectionWeek(today, startsOn);
  return today === to || today === addDays(to, 1);
}

/** How one habit went over one week. */
export interface HabitWeek {
  habit: Habit;
  routine: Routine;
  /** Days done in full or as the 2-minute version. */
  done: number;
  mini: number;
  skips: number;
  /** Days the habit was in a chain, up to yesterday, plus today once it's answered. */
  days: number;
  /** True when the habit got done on fewer than half its days. A cue to make it easier, never a judgment. */
  struggling: boolean;
}

/** Each habit's week, for habits that are still in a chain today. */
export function habitWeeks(
  routines: readonly Routine[],
  habits: readonly Habit[],
  checkIns: ReadonlyMap<string, CheckIn>,
  week: ReflectionWeek,
  today: DayKey,
): HabitWeek[] {
  const last = week.to < today ? week.to : today;
  const result: HabitWeek[] = [];
  const sorted = [...routines].sort((a, b) => a.order - b.order);
  for (const routine of sorted) {
    const own = habits
      .filter((h) => h.routineId === routine.id)
      .filter((h) => {
        const { until } = habitSpan(h, routine);
        return !until || until > today;
      })
      .sort((a, b) => a.order - b.order);
    for (const habit of own) {
      const entry: HabitWeek = {
        habit,
        routine,
        done: 0,
        mini: 0,
        skips: 0,
        days: 0,
        struggling: false,
      };
      for (let d = week.from; d <= last; d = addDays(d, 1)) {
        const status = dayStatus(habit, routine, checkIns, d, today);
        // Today only counts once it's answered, so an unfinished day never reads as a miss.
        if (status === 'off' || status === 'open') continue;
        entry.days++;
        if (status === 'full' || status === 'mini') entry.done++;
        if (status === 'mini') entry.mini++;
        if (status === 'skip') entry.skips++;
      }
      if (entry.days === 0) continue; // Not in a chain this week (started later).
      // A few days are needed before "hard this week" means anything.
      entry.struggling = entry.days >= 3 && entry.done * 2 < entry.days;
      result.push(entry);
    }
  }
  return result;
}

/** Trims a reflection note, folds blank lines, and caps its length. Empty means no note. */
export function cleanNote(note: string | undefined): string | undefined {
  const text = (note ?? '')
    .trim()
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, MAX_REFLECTION_LENGTH)
    .trim();
  return text || undefined;
}

/** The reflection for a week, if one was saved. */
export function reflectionFor(
  reflections: readonly Reflection[],
  week: DayKey,
): Reflection | undefined {
  return reflections.find((r) => r.week === week);
}

/** The most recent reflection from before a week, if any. */
export function previousReflection(
  reflections: readonly Reflection[],
  week: DayKey,
): Reflection | undefined {
  return [...reflections]
    .filter((r) => r.week < week)
    .sort((a, b) => b.week.localeCompare(a.week))[0];
}
