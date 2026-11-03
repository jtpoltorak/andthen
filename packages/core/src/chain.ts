import { addDays, minutesOf } from './dates';
import { dayStatus } from './history';
import type { CheckIn, CheckInKind, DayKey, Habit, LinkStatus, Routine } from './model';

/**
 * A gentle cue on a habit that wasn't checked in yesterday.
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
  /** Set while the habit is still open today and yesterday got no check-in at all. */
  nudge?: Nudge;
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

/** The nudge for a habit today, if yesterday went by without a check-in. */
export function nudgeFor(
  habit: Habit,
  routine: Routine | undefined,
  checkIns: ReadonlyMap<string, CheckIn>,
  today: DayKey,
): Nudge | undefined {
  if (dayStatus(habit, routine, checkIns, addDays(today, -1), today) !== 'missed') return undefined;
  const dayBefore = dayStatus(habit, routine, checkIns, addDays(today, -2), today);
  return dayBefore === 'missed' ? 'welcome-back' : 'dont-miss-twice';
}

/** Builds the chain for one routine on one day. */
export function buildChain(
  routine: Routine,
  habits: readonly Habit[],
  checkIns: ReadonlyMap<string, CheckIn>,
  day: DayKey,
): Chain {
  const own = habits.filter((h) => h.routineId === routine.id && isActiveOn(h, day)).sort(byOrder);

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
    const nudge = status === 'pending' ? nudgeFor(habit, routine, checkIns, day) : undefined;
    if (nudge) link.nudge = nudge;
    return link;
  });

  return {
    routine,
    links,
    doneCount: links.filter((l) => l.status === 'full' || l.status === 'mini').length,
    total: links.length,
    complete: links.length > 0 && !nextFound,
    atRisk: links.filter((l) => l.nudge === 'dont-miss-twice').length,
  };
}

/** Builds every active routine's chain for a day, in routine order. */
export function buildDay(
  routines: readonly Routine[],
  habits: readonly Habit[],
  checkIns: readonly CheckIn[],
  day: DayKey,
): Chain[] {
  const index = indexCheckIns(checkIns);
  return routines
    .filter((r) => isActiveOn(r, day))
    .sort(byOrder)
    .map((r) => buildChain(r, habits, index, day));
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
