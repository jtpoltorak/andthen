import { dayStatus, habitSpan, weekGrid } from './history';
import type { CheckIn, DayKey, Habit, Routine } from './model';
import { isPausedOn } from './pause';
import type { WeekStart } from './preferences';
import { weeklyTarget } from './schedule';

/** One week on a habit's trend line. */
export interface TrendWeek {
  /** First day of the week. */
  week: DayKey;
  /**
   * Share of the week's asked-for days that were done (full or 2-minute), from 0 to 1.
   * Undefined when the week asked for nothing: before the habit started, all rest days,
   * all skips, or a weekly habit whose week is still open.
   */
  share?: number;
}

/** Which way the trend points, comparing the latest weeks with the ones before. */
export type TrendDirection = 'up' | 'steady' | 'down';

export interface HabitTrend {
  /** Oldest first, ending with this week. */
  weeks: TrendWeek[];
  /** Set once there are at least 3 weeks with a share, so one week can't make a trend. */
  direction?: TrendDirection;
}

/** How far the recent average must move, as a share, to count as up or down. */
const MOVE = 0.1;
/** How many of the latest weeks count as "recent". */
const RECENT = 2;
/** Weeks needed before the line says anything. */
const MIN_WEEKS = 3;

const isDone = (kind: string | undefined) => kind === 'full' || kind === 'mini';

/**
 * How steady a habit has been, week by week, over the last `weeks` weeks.
 *
 * A day counts when the habit asked for it: done days count for, missed days against.
 * Skips, rest days and paused days don't count either way, and neither does today
 * while it's still open. An "N times a week" habit scores each week by how much of
 * its count it reached, capped at a full week.
 */
export function habitTrend(
  habit: Habit,
  routine: Routine | undefined,
  checkIns: ReadonlyMap<string, CheckIn>,
  today: DayKey,
  weeks = 8,
  weekStartsOn: WeekStart = 1,
): HabitTrend {
  const target = weeklyTarget(habit.schedule);
  const { from, until } = habitSpan(habit, routine);
  const trend: TrendWeek[] = weekGrid(today, weeks, weekStartsOn).map((days) => {
    const week = days[0];
    if (target !== undefined) {
      let done = 0;
      let available = 0;
      for (const d of days) {
        if (d <= today && isDone(checkIns.get(`${habit.id}|${d}`)?.kind)) done++;
        if (d >= from && (!until || d < until) && !isPausedOn(routine, d)) available++;
      }
      const need = Math.min(target, available);
      if (need === 0) return { week };
      // The week in progress only shows once its count is reached.
      if (days[6] >= today && done < need) return { week };
      return { week, share: Math.min(done / need, 1) };
    }
    let done = 0;
    let asked = 0;
    for (const d of days) {
      if (d > today) break;
      const status = dayStatus(habit, routine, checkIns, d, today, weekStartsOn);
      if (status === 'full' || status === 'mini') {
        done++;
        asked++;
      } else if (status === 'missed') asked++;
    }
    return asked ? { week, share: done / asked } : { week };
  });
  return { weeks: trend, direction: direction(trend) };
}

/**
 * Compares the last two weeks with the ones before them. Both recent weeks have to agree
 * before the line says "up" or "down", so one good or bad week never flips it.
 */
function direction(weeks: readonly TrendWeek[]): TrendDirection | undefined {
  const shares = weeks.map((w) => w.share).filter((s): s is number => s !== undefined);
  if (shares.length < MIN_WEEKS) return undefined;
  const recent = shares.slice(-RECENT);
  const before = average(shares.slice(0, -RECENT));
  if (Math.min(...recent) - before >= MOVE) return 'up';
  if (before - Math.max(...recent) >= MOVE) return 'down';
  return 'steady';
}

const average = (values: readonly number[]) =>
  values.reduce((sum, v) => sum + v, 0) / values.length;
