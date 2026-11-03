import { describe, expect, it } from 'vitest';
import { buildChain, buildDay, indexCheckIns } from './chain';
import { addDays } from './dates';
import { dayStatus, habitStats } from './history';
import type { CheckIn, Habit, Routine, Schedule } from './model';
import { habitWeeks } from './reflection';
import { planReminders } from './reminders';
import { DEFAULT_REMINDER_PREFS } from './reminders';
import {
  WEEKDAYS,
  describeSchedule,
  isPlannedDay,
  normalizeSchedule,
  parseSchedule,
} from './schedule';

// 2026-11-02 is a Monday. Weeks below: Nov 2 to 8, Nov 9 to 15, Nov 16 to 22.
const MON = '2026-11-02';
const SAT = '2026-11-07';
const SUN = '2026-11-08';

const routine: Routine = {
  id: 'am',
  anchor: 'After I pour my coffee',
  usualTime: '07:30',
  order: 0,
  createdOn: '2026-10-01',
};

const habit = (schedule?: Schedule, over: Partial<Habit> = {}): Habit => ({
  id: 'gym',
  routineId: 'am',
  name: 'Gym',
  twoMinuteVersion: 'Put on gym clothes',
  order: 0,
  createdOn: '2026-10-01',
  ...(schedule ? { schedule } : {}),
  ...over,
});

const weekdays: Schedule = { kind: 'days', days: [...WEEKDAYS] };
const threeAWeek: Schedule = { kind: 'weekly', times: 3 };

const done = (...dates: string[]): CheckIn[] =>
  dates.map((date) => ({ habitId: 'gym', date, kind: 'full' }));

describe('schedules', () => {
  it('describes schedules in plain words', () => {
    expect(describeSchedule(undefined)).toBe('Every day');
    expect(describeSchedule(weekdays)).toBe('Weekdays');
    expect(describeSchedule({ kind: 'days', days: [0, 6] })).toBe('Weekends');
    expect(describeSchedule({ kind: 'days', days: [5, 1, 3] })).toBe('Mon, Wed, Fri');
    expect(describeSchedule({ kind: 'days', days: [0, 1] })).toBe('Mon, Sun');
    expect(describeSchedule(threeAWeek)).toBe('3 times a week');
    expect(describeSchedule({ kind: 'weekly', times: 1 })).toBe('Once a week');
  });

  it('treats all seven days, or seven times a week, as every day', () => {
    expect(normalizeSchedule({ kind: 'days', days: [0, 1, 2, 3, 4, 5, 6] })).toBeUndefined();
    expect(normalizeSchedule({ kind: 'weekly', times: 7 })).toBeUndefined();
    expect(normalizeSchedule({ kind: 'days', days: [3, 1, 1] })).toEqual({
      kind: 'days',
      days: [1, 3],
    });
  });

  it('reads stored schedules defensively', () => {
    expect(parseSchedule(undefined)).toBeUndefined();
    expect(parseSchedule({ kind: 'weekly', times: 2 })).toEqual({ kind: 'weekly', times: 2 });
    expect(parseSchedule({ kind: 'days', days: [1, 2, 3, 4, 5] })).toEqual(weekdays);
    expect(parseSchedule({ kind: 'weekly', times: 0 })).toBeNull();
    expect(parseSchedule({ kind: 'days', days: [9] })).toBeNull();
    expect(parseSchedule({ kind: 'days', days: [] })).toBeNull();
    expect(parseSchedule('daily')).toBeNull();
  });

  it('knows which days are planned', () => {
    expect(isPlannedDay(weekdays, MON)).toBe(true);
    expect(isPlannedDay(weekdays, SAT)).toBe(false);
    expect(isPlannedDay(threeAWeek, SAT)).toBe(true);
    expect(isPlannedDay(undefined, SAT)).toBe(true);
  });
});

describe('a weekdays-only habit', () => {
  const gym = habit(weekdays);

  it('rests on the weekend: off Today, and never a miss', () => {
    const index = indexCheckIns([]);
    expect(dayStatus(gym, routine, index, SAT, SUN)).toBe('rest');
    expect(buildChain(routine, [gym], index, SAT)).toMatchObject({ total: 0, resting: 1 });
    expect(buildChain(routine, [gym], index, MON).total).toBe(1);
  });

  it('keeps its chain across the weekend', () => {
    const checkIns = done(MON, '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06');
    const stats = habitStats(gym, routine, indexCheckIns(checkIns), addDays(SUN, 1));
    // Five weekdays done; the weekend neither breaks nor adds to it; Monday is still open.
    expect(stats).toMatchObject({ currentChain: 5, atRisk: false, unit: 'day' });
  });

  it('nudges on Monday after a missed Friday, not after the weekend', () => {
    const checkIns = done(MON, '2026-11-03', '2026-11-04', '2026-11-05');
    const [link] = buildChain(routine, [gym], indexCheckIns(checkIns), addDays(SUN, 1)).links;
    expect(link).toMatchObject({ nudge: 'dont-miss-twice', missedOn: '2026-11-06' });

    const allDone = done(MON, '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06');
    const [fine] = buildChain(routine, [gym], indexCheckIns(allDone), addDays(SUN, 1)).links;
    expect(fine.nudge).toBeUndefined();
  });

  it('sends no reminder on a rest day', () => {
    const prefs = { ...DEFAULT_REMINDER_PREFS, enabled: true };
    expect(planReminders(buildDay([routine], [gym], [], SAT), prefs)).toEqual([]);
    expect(planReminders(buildDay([routine], [gym], [], MON), prefs)).toHaveLength(1);
  });

  it('counts only planned days in the weekly reflection', () => {
    const checkIns = indexCheckIns(done(MON, '2026-11-03', '2026-11-04'));
    const [week] = habitWeeks([routine], [gym], checkIns, { from: MON, to: SUN }, SUN);
    expect(week).toMatchObject({ done: 3, days: 5, struggling: false });
  });
});

describe('a 3-times-a-week habit', () => {
  const gym = habit(threeAWeek);

  it('stays on Today until the week’s count is reached, then rests', () => {
    const tue = '2026-11-03';
    const index = indexCheckIns(done(MON, tue));
    const [link] = buildChain(routine, [gym], index, '2026-11-04').links;
    expect(link.week).toEqual({ done: 2, target: 3 });
    expect(dayStatus(gym, routine, index, '2026-11-04', '2026-11-04')).toBe('open');

    const reached = indexCheckIns(done(MON, tue, '2026-11-04'));
    expect(buildChain(routine, [gym], reached, '2026-11-05')).toMatchObject({
      total: 0,
      resting: 1,
    });
    // Done today shows as done, with the count reached.
    expect(buildChain(routine, [gym], reached, '2026-11-04').links[0].week).toEqual({
      done: 3,
      target: 3,
    });
  });

  it('never calls a single day a miss, so it never nudges', () => {
    const index = indexCheckIns(done(MON));
    expect(dayStatus(gym, routine, index, '2026-11-03', '2026-11-05')).toBe('rest');
    expect(buildChain(routine, [gym], index, '2026-11-05').links[0].nudge).toBeUndefined();
  });

  it('chains whole weeks, forgiving one short week', () => {
    const week = (start: string, n: number) =>
      Array.from({ length: n }, (_, i) => addDays(start, i));
    const checkIns = done(
      ...week('2026-10-26', 3), // reached
      ...week(MON, 1), // short
      ...week('2026-11-09', 3), // reached
    );
    const stats = habitStats(gym, routine, indexCheckIns(checkIns), '2026-11-17');
    // Three weeks, the short one forgiven; this week isn't reached yet so it's still open.
    expect(stats).toMatchObject({ currentChain: 3, unit: 'week', atRisk: false });
    expect(stats.full).toBe(7);
  });

  it('ends the chain after two short weeks in a row', () => {
    const checkIns = done('2026-10-26', '2026-10-27', '2026-10-28', MON, '2026-11-09');
    const stats = habitStats(gym, routine, indexCheckIns(checkIns), '2026-11-17');
    expect(stats).toMatchObject({ currentChain: 0, bestChain: 1 });
  });

  it('asks only for what fits in a first partial week', () => {
    // Starts on Saturday: only Sat and Sun are left, so two is enough that week.
    const late = habit(threeAWeek, { createdOn: SAT });
    const stats = habitStats(late, routine, indexCheckIns(done(SAT, SUN)), '2026-11-09');
    expect(stats.currentChain).toBe(1);
  });

  it('reports the week as a count in the reflection', () => {
    const [entry] = habitWeeks(
      [routine],
      [gym],
      indexCheckIns(done(MON)),
      { from: MON, to: SUN },
      SUN,
    );
    expect(entry).toMatchObject({ done: 1, days: 3, target: 3, struggling: true });
    const midweek = habitWeeks(
      [routine],
      [gym],
      indexCheckIns([]),
      { from: MON, to: SUN },
      '2026-11-04',
    );
    expect(midweek[0].struggling).toBe(false);
  });
});
