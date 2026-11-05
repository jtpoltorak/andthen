import { addDays, fromDayKey } from './dates';
import type { CheckIn, DayKey, Habit, Routine } from './model';
import type { WeekStart } from './preferences';
import { isPausedOn } from './pause';
import { isPlannedDay, weeklyTarget } from './schedule';

/**
 * How one habit went on one day.
 * - `full` / `mini` / `skip`: the check-in for that day.
 * - `missed`: the habit was in its chain but got no answer.
 * - `open`: today, not answered yet. Never counted against anyone.
 * - `rest`: the habit's schedule didn't ask for it that day (an off day, or a weekly
 *   habit on a day it wasn't done), or its routine was paused. Never counted for or against anyone.
 * - `off`: the habit wasn't in a chain that day (not started yet, retired, or in the future).
 */
export type DayStatus = 'full' | 'mini' | 'skip' | 'missed' | 'open' | 'rest' | 'off';

const isDone = (s: DayStatus) => s === 'full' || s === 'mini';

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
  /** The chain is alive but the last finished day (or week) was a miss: one more and it ends. */
  atRisk: boolean;
  /** What the chain counts: days, or weeks for an "N times a week" habit. */
  unit: 'day' | 'week';
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
  weekStartsOn: WeekStart = 1,
): DayStatus {
  // A check-in always wins, so history survives later edits to start or end dates.
  const kind = checkIns.get(`${habit.id}|${day}`)?.kind;
  if (kind && day <= today) return kind;
  const { from, until } = habitSpan(habit, routine);
  if (day > today || day < from || (until && day >= until)) return 'off';
  if (!isPlannedDay(habit.schedule, day) || isPausedOn(routine, day)) return 'rest';
  const target = weeklyTarget(habit.schedule);
  if (target !== undefined) {
    // "N times a week": a day without a check-in is never a miss. Today stays open
    // until the week's count is reached.
    if (day < today) return 'rest';
    return doneThisWeek(habit, checkIns, day, weekStartsOn, false) >= target ? 'rest' : 'open';
  }
  return day === today ? 'open' : 'missed';
}

/**
 * Days done (full or 2-minute) in the week that holds `day`, up to `day`.
 * `includeDay` decides whether `day` itself counts.
 */
export function doneThisWeek(
  habit: Habit,
  checkIns: ReadonlyMap<string, CheckIn>,
  day: DayKey,
  weekStartsOn: WeekStart = 1,
  includeDay = true,
): number {
  let done = 0;
  for (
    let d = weekStart(day, weekStartsOn);
    d < day || (includeDay && d === day);
    d = addDays(d, 1)
  ) {
    if (isDone(checkIns.get(`${habit.id}|${d}`)?.kind ?? 'off')) done++;
  }
  return done;
}

/** The habit's days from `from` to `to`, both inclusive. */
export function habitDays(
  habit: Habit,
  routine: Routine | undefined,
  checkIns: ReadonlyMap<string, CheckIn>,
  from: DayKey,
  to: DayKey,
  today: DayKey,
  weekStartsOn: WeekStart = 1,
): HabitDay[] {
  const days: HabitDay[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    days.push({ date: d, status: dayStatus(habit, routine, checkIns, d, today, weekStartsOn) });
  }
  return days;
}

/** One step of a chain: a day, or a week for "N times a week" habits. */
type Mark = 'done' | 'skip' | 'missed';

/**
 * Lifetime stats for one habit. A chain starts on a day the habit is done and
 * keeps going through skips, rest days and single misses. Two misses in a row end it,
 * and neither of those two days counts toward its length.
 *
 * An "N times a week" habit chains whole weeks instead: a week that reaches its
 * count is a link, a finished week that falls short is a miss, and the week in
 * progress only counts once it's reached.
 */
export function habitStats(
  habit: Habit,
  routine: Routine | undefined,
  checkIns: ReadonlyMap<string, CheckIn>,
  today: DayKey,
  weekStartsOn: WeekStart = 1,
): HabitStats {
  const target = weeklyTarget(habit.schedule);
  const stats: HabitStats = {
    currentChain: 0,
    bestChain: 0,
    full: 0,
    mini: 0,
    skips: 0,
    atRisk: false,
    unit: target === undefined ? 'day' : 'week',
  };
  const { from, until } = habitSpan(habit, routine);

  // Include days with check-ins outside the span, in case dates were edited.
  let start = from;
  for (const c of checkIns.values()) {
    if (c.habitId === habit.id && c.date < start) start = c.date;
  }

  const marks: Mark[] = [];
  for (const { date, status } of habitDays(
    habit,
    routine,
    checkIns,
    start,
    today,
    today,
    weekStartsOn,
  )) {
    if (status === 'full') stats.full++;
    if (status === 'mini') stats.mini++;
    if (status === 'skip') stats.skips++;
    if (isDone(status)) stats.lastDone = date;
    if (target !== undefined) continue;
    if (isDone(status)) marks.push('done');
    else if (status === 'skip') marks.push('skip');
    else if (status === 'missed') marks.push('missed');
    // off, rest, and today while it's open don't move the chain.
  }

  if (target !== undefined) {
    const thisWeek = weekStart(today, weekStartsOn);
    for (let week = weekStart(start, weekStartsOn); week <= thisWeek; week = addDays(week, 7)) {
      const end = addDays(week, 6);
      let done = 0;
      let available = 0;
      for (let d = week; d <= end; d = addDays(d, 1)) {
        if (isDone(checkIns.get(`${habit.id}|${d}`)?.kind ?? 'off')) done++;
        if (d >= from && (!until || d < until) && !isPausedOn(routine, d)) available++;
      }
      // A habit that starts (or ends, or is paused) midweek only asks for what fits.
      const need = Math.min(target, available);
      if (need === 0 && done === 0) continue;
      if (done >= need) marks.push('done');
      else if (end < today) marks.push('missed');
      // The current week, not reached yet: still open.
    }
  }

  let chain = 0; // Length of the running chain, 0 when none.
  let pendingMiss = false; // A miss that hasn't been followed by a second one (yet).
  for (const mark of marks) {
    if (mark === 'missed') {
      if (pendingMiss) {
        // Second miss in a row: the chain ends without either missed step.
        chain = 0;
        pendingMiss = false;
        continue;
      }
      if (chain > 0) pendingMiss = true;
      continue;
    }
    if (chain === 0 && mark !== 'done') continue; // Chains start with a done step.
    if (pendingMiss) chain++; // The forgiven miss counts as part of the chain.
    pendingMiss = false;
    chain++;
    stats.bestChain = Math.max(stats.bestChain, chain);
  }
  // A single trailing miss still leaves the chain alive and counted.
  stats.currentChain = chain + (pendingMiss ? 1 : 0);
  stats.atRisk = pendingMiss;
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
