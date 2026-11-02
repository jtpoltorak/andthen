import { addDays, fromDayKey } from './dates';
import type { CheckIn, DayKey, Habit, Routine } from './model';
import type { WeekStart } from './preferences';

/**
 * How one habit went on one day.
 * - `full` / `mini` / `skip`: the check-in for that day.
 * - `missed`: the habit was in its chain but got no answer.
 * - `open`: today, not answered yet. Never counted against anyone.
 * - `off`: the habit wasn't in a chain that day (not started yet, retired, or in the future).
 */
export type DayStatus = 'full' | 'mini' | 'skip' | 'missed' | 'open' | 'off';

export interface HabitDay {
  date: DayKey;
  status: DayStatus;
}

/**
 * Forgiving numbers for one habit. A "chain" only breaks after two missed days
 * in a row ("never miss twice"); a single miss or a skip keeps it going.
 */
export interface HabitStats {
  /** Days in the current chain, counting today once it's answered. 0 when there's no chain going. */
  currentChain: number;
  /** The longest chain so far. */
  bestChain: number;
  /** Days done in full. */
  full: number;
  /** Days done as the 2-minute version. */
  mini: number;
  skips: number;
  /** The most recent day done (full or 2-minute). */
  lastDone?: DayKey;
}

/** Totals across every habit for a span of days (e.g. this week). */
export interface PeriodSummary {
  full: number;
  mini: number;
  skips: number;
  /** Days with at least one habit done (full or 2-minute). */
  daysShowedUp: number;
  /** Days in the span that have started (today included). */
  daysSoFar: number;
}

/** The first day (inclusive) and last day (exclusive) a habit is part of a chain. */
export function habitSpan(habit: Habit, routine?: Routine): { from: DayKey; until?: DayKey } {
  const from = routine && routine.createdOn > habit.createdOn ? routine.createdOn : habit.createdOn;
  const ends = [habit.archivedOn, routine?.archivedOn].filter((d): d is DayKey => !!d).sort();
  return { from, until: ends[0] };
}

/** The status of one habit on one day. `checkIns` is the index from `indexCheckIns`. */
export function dayStatus(
  habit: Habit,
  routine: Routine | undefined,
  checkIns: ReadonlyMap<string, CheckIn>,
  day: DayKey,
  today: DayKey,
): DayStatus {
  // A check-in always wins, so history survives later edits to start or end dates.
  const kind = checkIns.get(`${habit.id}|${day}`)?.kind;
  if (kind && day <= today) return kind;
  const { from, until } = habitSpan(habit, routine);
  if (day > today || day < from || (until && day >= until)) return 'off';
  return day === today ? 'open' : 'missed';
}

/** The habit's days from `from` to `to`, both inclusive. */
export function habitDays(
  habit: Habit,
  routine: Routine | undefined,
  checkIns: ReadonlyMap<string, CheckIn>,
  from: DayKey,
  to: DayKey,
  today: DayKey,
): HabitDay[] {
  const days: HabitDay[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    days.push({ date: d, status: dayStatus(habit, routine, checkIns, d, today) });
  }
  return days;
}

const isDone = (s: DayStatus) => s === 'full' || s === 'mini';

/**
 * Lifetime stats for one habit. A chain starts on a day the habit is done and
 * keeps going through skips and single misses. Two misses in a row end it, and
 * neither of those two days counts toward its length.
 */
export function habitStats(
  habit: Habit,
  routine: Routine | undefined,
  checkIns: ReadonlyMap<string, CheckIn>,
  today: DayKey,
): HabitStats {
  const stats: HabitStats = { currentChain: 0, bestChain: 0, full: 0, mini: 0, skips: 0 };
  const { from } = habitSpan(habit, routine);

  // Include days with check-ins outside the span, in case dates were edited.
  let start = from;
  for (const c of checkIns.values()) {
    if (c.habitId === habit.id && c.date < start) start = c.date;
  }

  let chain = 0; // Length of the running chain, 0 when none.
  let pendingMiss = false; // A miss that hasn't been followed by a second one (yet).
  for (const { date, status } of habitDays(habit, routine, checkIns, start, today, today)) {
    if (status === 'off' || status === 'open') continue; // Today isn't over yet.
    if (status === 'full') stats.full++;
    if (status === 'mini') stats.mini++;
    if (status === 'skip') stats.skips++;
    if (isDone(status)) stats.lastDone = date;

    if (status === 'missed') {
      if (pendingMiss) {
        // Second miss in a row: the chain ends without either missed day.
        chain = 0;
        pendingMiss = false;
        continue;
      }
      if (chain > 0) pendingMiss = true;
      continue;
    }
    if (chain === 0 && !isDone(status)) continue; // Chains start with a done day.
    if (pendingMiss) chain++; // The forgiven miss counts as part of the chain.
    pendingMiss = false;
    chain++;
    stats.bestChain = Math.max(stats.bestChain, chain);
  }
  // A single trailing miss (yesterday) still leaves the chain alive and counted.
  stats.currentChain = chain + (pendingMiss ? 1 : 0);
  stats.bestChain = Math.max(stats.bestChain, stats.currentChain);
  return stats;
}

/** First day of the week that holds `day`: Monday by default, or Sunday when `startsOn` is 0. */
export function weekStart(day: DayKey, startsOn: WeekStart = 1): DayKey {
  const sinceStart = (fromDayKey(day).getDay() - startsOn + 7) % 7;
  return addDays(day, -sinceStart);
}

/**
 * A calendar of `weeks` whole weeks ending with the week that holds `today`,
 * oldest first. Each week is 7 DayKeys, starting on Monday unless `startsOn` is 0 (Sunday).
 */
export function weekGrid(today: DayKey, weeks: number, startsOn: WeekStart = 1): DayKey[][] {
  const first = addDays(weekStart(today, startsOn), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)),
  );
}

/** Totals over every check-in from `from` to `today`, both inclusive. */
export function summarize(
  checkIns: readonly CheckIn[],
  from: DayKey,
  today: DayKey,
): PeriodSummary {
  const summary: PeriodSummary = { full: 0, mini: 0, skips: 0, daysShowedUp: 0, daysSoFar: 0 };
  const showedUp = new Set<DayKey>();
  for (const c of checkIns) {
    if (c.date < from || c.date > today) continue;
    if (c.kind === 'full') summary.full++;
    if (c.kind === 'mini') summary.mini++;
    if (c.kind === 'skip') summary.skips++;
    if (c.kind !== 'skip') showedUp.add(c.date);
  }
  summary.daysShowedUp = showedUp.size;
  for (let d = from; d <= today; d = addDays(d, 1)) summary.daysSoFar++;
  return summary;
}
