import { addDays, minutesOf } from './dates';
import { dayStatus, doneThisWeek } from './history';
import type { CheckIn, CheckInKind, DayKey, Habit, LinkStatus, Pause, Routine } from './model';
import { pauseOn } from './pause';
import type { WeekStart } from './preferences';
import { weeklyTarget } from './schedule';

/**
 * A gentle cue on a habit that wasn't checked in the last day it was planned
 * (yesterday, for an every-day habit). Rest days in between don't count.
 * - `dont-miss-twice`: one missed day, so the chain is still alive. Today keeps it going.
 * - `welcome-back`: two or more missed days in a row. No guilt, just an easy restart.
 * A skip is a conscious choice, not a miss, so it never brings a nudge.
 */
export type Nudge = 'dont-miss-twice' | 'welcome-back';

/** One habit as it appears in today's chain. */
export interface ChainLink {
  habit: Habit;
  status: LinkStatus;
  /** True for the first pending link: the one the Today screen asks about. */
  isNext: boolean;
  /**
   * True when this habit existed yesterday but wasn't done (full or mini).
   * Drives the "don't miss twice" nudge, which offers the 2-minute version first.
   */
  missedYesterday: boolean;
  /** Set while the habit is still open today and its last planned day got no check-in at all. */
  nudge?: Nudge;
  /** The missed day behind a nudge (yesterday for an every-day habit). */
  missedOn?: DayKey;
  /** For "N times a week" habits: days done this week (today included) out of the target. */
  week?: { done: number; target: number };
}

export interface Chain {
  routine: Routine;
  links: ChainLink[];
  /** Links done in full or as the 2-minute version. Skips don't count. */
  doneCount: number;
  total: number;
  /** Every link has been answered (done, mini or skipped). */
  complete: boolean;
  /** Open links whose chain is one miss from breaking ("don't miss twice"). */
  atRisk: number;
  /** Habits in this routine that have a rest day today (by their schedule), so aren't listed. */
  resting: number;
  /** Set when the routine is paused today. Nothing is listed, and nothing counts as missed. */
  paused?: Pause;
}

const isActiveOn = (item: { createdOn: DayKey; archivedOn?: DayKey }, day: DayKey) =>
  item.createdOn <= day && (!item.archivedOn || item.archivedOn > day);

const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;

const countsAsDone = (kind: CheckInKind | undefined) => kind === 'full' || kind === 'mini';

/** Indexes check-ins by `habitId|date` for O(1) lookups. */
export function indexCheckIns(checkIns: readonly CheckIn[]): Map<string, CheckIn> {
  const index = new Map<string, CheckIn>();
  for (const c of checkIns) index.set(`${c.habitId}|${c.date}`, c);
  return index;
}

/** "Never miss twice": the habit existed yesterday and wasn't done in full or as the 2-minute version. */
export function missedYesterday(
  habit: Habit,
  checkIns: ReadonlyMap<string, CheckIn>,
  today: DayKey,
): boolean {
  const yesterday = addDays(today, -1);
  if (!isActiveOn(habit, yesterday)) return false;
  return !countsAsDone(checkIns.get(`${habit.id}|${yesterday}`)?.kind);
}

/** How far back to look for a habit's last planned day (a week, plus room for odd schedules). */
const LOOK_BACK_DAYS = 14;

/** The last day before `day` that the habit was planned for (not a rest day), and how it went. */
function lastPlannedDay(
  habit: Habit,
  routine: Routine | undefined,
  checkIns: ReadonlyMap<string, CheckIn>,
  day: DayKey,
  today: DayKey,
  weekStartsOn: WeekStart,
) {
  for (let i = 1; i <= LOOK_BACK_DAYS; i++) {
    const date = addDays(day, -i);
    const status = dayStatus(habit, routine, checkIns, date, today, weekStartsOn);
    if (status !== 'rest') return { date, status };
  }
  return undefined;
}

/**
 * The nudge for a habit today, if its last planned day went by without a check-in.
 * "N times a week" habits never miss a single day, so they never get one.
 */
export function nudgeFor(
  habit: Habit,
  routine: Routine | undefined,
  checkIns: ReadonlyMap<string, CheckIn>,
  today: DayKey,
  weekStartsOn: WeekStart = 1,
): { nudge: Nudge; missedOn: DayKey } | undefined {
  const last = lastPlannedDay(habit, routine, checkIns, today, today, weekStartsOn);
  if (last?.status !== 'missed') return undefined;
  const before = lastPlannedDay(habit, routine, checkIns, last.date, today, weekStartsOn);
  const nudge = before?.status === 'missed' ? 'welcome-back' : 'dont-miss-twice';
  return { nudge, missedOn: last.date };
}

/** Builds the chain for one routine on one day. */
export function buildChain(
  routine: Routine,
  habits: readonly Habit[],
  checkIns: ReadonlyMap<string, CheckIn>,
  day: DayKey,
  weekStartsOn: WeekStart = 1,
): Chain {
  const active = habits.filter((h) => h.routineId === routine.id && isActiveOn(h, day));
  // A habit resting today (an off day, or a weekly count already reached) stays off the list.
  const own = active
    .filter((h) => dayStatus(h, routine, checkIns, day, day, weekStartsOn) !== 'rest')
    .sort(byOrder);

  let nextFound = false;
  const links = own.map((habit): ChainLink => {
    const status: LinkStatus = checkIns.get(`${habit.id}|${day}`)?.kind ?? 'pending';
    const isNext = !nextFound && status === 'pending';
    if (isNext) nextFound = true;
    const link: ChainLink = {
      habit,
      status,
      isNext,
      missedYesterday: missedYesterday(habit, checkIns, day),
    };
    const nudge =
      status === 'pending' ? nudgeFor(habit, routine, checkIns, day, weekStartsOn) : undefined;
    if (nudge) {
      link.nudge = nudge.nudge;
      link.missedOn = nudge.missedOn;
    }
    const target = weeklyTarget(habit.schedule);
    if (target !== undefined) {
      link.week = { done: doneThisWeek(habit, checkIns, day, weekStartsOn), target };
    }
    return link;
  });

  const chain: Chain = {
    routine,
    links,
    doneCount: links.filter((l) => l.status === 'full' || l.status === 'mini').length,
    total: links.length,
    complete: links.length > 0 && !nextFound,
    atRisk: links.filter((l) => l.nudge === 'dont-miss-twice').length,
    resting: active.length - own.length,
  };
  const paused = pauseOn(routine, day);
  if (paused) chain.paused = paused;
  return chain;
}

/** Builds every active routine's chain for a day, in routine order. */
export function buildDay(
  routines: readonly Routine[],
  habits: readonly Habit[],
  checkIns: readonly CheckIn[],
  day: DayKey,
  weekStartsOn: WeekStart = 1,
): Chain[] {
  const index = indexCheckIns(checkIns);
  return routines
    .filter((r) => isActiveOn(r, day))
    .sort(byOrder)
    .map((r) => buildChain(r, habits, index, day, weekStartsOn));
}

/**
 * Picks the routine the Today screen should open: the first unfinished one whose
 * usual time has passed, else the first unfinished one. The clock never locks anyone out.
 */
export function pickActiveRoutine(
  chains: readonly Chain[],
  minutesNow: number,
): string | undefined {
  const open = chains.filter((c) => c.total > 0 && !c.complete);
  const due = open.filter((c) => {
    const at = minutesOf(c.routine.usualTime);
    return at !== undefined && at <= minutesNow;
  });
  return (due[0] ?? open[0])?.routine.id;
}

/** A part of the day, from a routine's usual time. Routines with no time are "anytime". */
export type PartOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

const PART_ORDER: readonly PartOfDay[] = ['morning', 'afternoon', 'evening', 'anytime'];

/** Before noon is morning, noon to 5 pm is afternoon, 5 pm on is evening. */
export function partOfDay(usualTime: string | undefined): PartOfDay {
  const at = minutesOf(usualTime);
  if (at === undefined) return 'anytime';
  if (at < 12 * 60) return 'morning';
  if (at < 17 * 60) return 'afternoon';
  return 'evening';
}

/**
 * Groups chains by part of the day, in day order, keeping the person's own order
 * inside each group. Empty groups are left out.
 */
export function chainsByPartOfDay<T extends Pick<Chain, 'routine'>>(
  chains: readonly T[],
): { part: PartOfDay; chains: T[] }[] {
  return PART_ORDER.map((part) => ({
    part,
    chains: chains.filter((c) => partOfDay(c.routine.usualTime) === part),
  })).filter((group) => group.chains.length > 0);
}

/** Records (or replaces) the check-in for a habit on a day. Returns a new array. */
export function upsertCheckIn(
  checkIns: readonly CheckIn[],
  habitId: string,
  date: DayKey,
  kind: CheckInKind,
): CheckIn[] {
  return [
    ...checkIns.filter((c) => !(c.habitId === habitId && c.date === date)),
    { habitId, date, kind },
  ];
}

/** Removes the check-in for a habit on a day (undo). Returns a new array. */
export function removeCheckIn(
  checkIns: readonly CheckIn[],
  habitId: string,
  date: DayKey,
): CheckIn[] {
  return checkIns.filter((c) => !(c.habitId === habitId && c.date === date));
}

/** The next `order` value for appending to a list. */
export function nextOrder(items: readonly { order: number }[]): number {
  return items.reduce((max, i) => Math.max(max, i.order), -1) + 1;
}
