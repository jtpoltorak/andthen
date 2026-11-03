import { describe, expect, it } from 'vitest';
import { indexCheckIns } from './chain';
import { addDays } from './dates';
import type { CheckIn, Habit, Reflection, Routine } from './model';
import {
  MAX_REFLECTION_LENGTH,
  cleanNote,
  habitWeeks,
  isReflectionDay,
  previousReflection,
  reflectionFor,
  reflectionWeek,
} from './reflection';

// 2026-10-26 is a Monday; 2026-11-01 is a Sunday.
const MON = '2026-10-26';
const SUN = '2026-11-01';

const routine = (over: Partial<Routine> = {}): Routine => ({
  id: 'morning',
  anchor: 'After I pour my coffee',
  order: 0,
  createdOn: '2026-10-01',
  ...over,
});

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'water',
  routineId: 'morning',
  name: 'Drink water',
  twoMinuteVersion: 'One sip',
  order: 0,
  createdOn: '2026-10-01',
  ...over,
});

/** F = full, M = mini, S = skip, . = nothing; one character per day from `from`. */
const pattern = (habitId: string, from: string, days: string): CheckIn[] =>
  [...days].flatMap((ch, i) => {
    const kind = ({ F: 'full', M: 'mini', S: 'skip' } as const)[ch as 'F' | 'M' | 'S'];
    return kind ? [{ habitId, date: addDays(from, i), kind }] : [];
  });

describe('reflectionWeek', () => {
  it('is the current week from Tuesday to Sunday', () => {
    expect(reflectionWeek(SUN)).toEqual({ from: MON, to: SUN });
    expect(reflectionWeek('2026-10-28')).toEqual({ from: MON, to: SUN });
  });

  it('is the week that just ended on Monday', () => {
    expect(reflectionWeek('2026-11-02')).toEqual({ from: MON, to: SUN });
  });

  it('follows a Sunday week start', () => {
    // Saturday ends a Sunday-first week; Sunday is the grace day.
    expect(reflectionWeek('2026-10-31', 0)).toEqual({ from: '2026-10-25', to: '2026-10-31' });
    expect(reflectionWeek(SUN, 0)).toEqual({ from: '2026-10-25', to: '2026-10-31' });
  });
});

describe('isReflectionDay', () => {
  it('is Sunday and Monday by default', () => {
    expect(isReflectionDay(SUN)).toBe(true);
    expect(isReflectionDay('2026-11-02')).toBe(true);
    expect(isReflectionDay('2026-11-03')).toBe(false);
    expect(isReflectionDay('2026-10-31')).toBe(false);
  });

  it('is Saturday and Sunday when weeks start on Sunday', () => {
    expect(isReflectionDay('2026-10-31', 0)).toBe(true);
    expect(isReflectionDay(SUN, 0)).toBe(true);
    expect(isReflectionDay('2026-11-02', 0)).toBe(false);
  });
});

describe('habitWeeks', () => {
  const week = { from: MON, to: SUN };

  it('counts done days, 2-minute days and skips, and flags a hard week', () => {
    const habits = [habit(), habit({ id: 'stretch', name: 'Stretch', order: 1 })];
    const checkIns = [...pattern('water', MON, 'FFMSFF.'), ...pattern('stretch', MON, 'F..S..M')];
    const [water, stretch] = habitWeeks([routine()], habits, indexCheckIns(checkIns), week, SUN);
    // Water has no answer yet today (Sunday), so today isn't counted.
    expect(water).toMatchObject({ done: 5, mini: 1, skips: 1, days: 6, struggling: false });
    expect(stretch).toMatchObject({ done: 2, mini: 1, skips: 1, days: 7, struggling: true });
  });

  it('only counts days so far, and does not count today against anyone', () => {
    const today = '2026-10-29';
    const checkIns = pattern('water', MON, 'F..');
    const [water] = habitWeeks([routine()], [habit()], indexCheckIns(checkIns), week, today);
    // Mon done, Tue and Wed missed, Thu (today) still open.
    expect(water).toMatchObject({ done: 1, days: 3, struggling: true });
    const done = [...checkIns, { habitId: 'water', date: today, kind: 'full' as const }];
    expect(habitWeeks([routine()], [habit()], indexCheckIns(done), week, today)[0]).toMatchObject({
      done: 2,
      days: 4,
      struggling: false,
    });
  });

  it('waits a few days before calling a week hard', () => {
    const fresh = habit({ createdOn: '2026-10-30' });
    const [water] = habitWeeks([routine()], [fresh], indexCheckIns([]), week, SUN);
    expect(water.days).toBe(2);
    expect(water.struggling).toBe(false);
  });

  it('leaves out retired habits and habits that start later', () => {
    const habits = [
      habit({ archivedOn: '2026-10-29' }),
      habit({ id: 'later', createdOn: '2026-11-05' }),
    ];
    expect(habitWeeks([routine()], habits, indexCheckIns([]), week, SUN)).toEqual([]);
  });
});

describe('notes', () => {
  it('trims, caps, and drops empty notes', () => {
    expect(cleanNote('  Walked daily  ')).toBe('Walked daily');
    expect(cleanNote('   ')).toBeUndefined();
    expect(cleanNote(undefined)).toBeUndefined();
    expect(cleanNote('x'.repeat(400))).toHaveLength(MAX_REFLECTION_LENGTH);
  });

  it('finds this week and the last one before it', () => {
    const list: Reflection[] = [
      { week: '2026-10-12', tweak: 'Old', savedOn: '2026-10-18' },
      { week: '2026-10-19', tweak: 'Water by the bed', savedOn: '2026-10-25' },
      { week: MON, wentWell: 'Most days', savedOn: SUN },
    ];
    expect(reflectionFor(list, MON)?.wentWell).toBe('Most days');
    expect(previousReflection(list, MON)?.tweak).toBe('Water by the bed');
    expect(previousReflection(list, '2026-10-12')).toBeUndefined();
  });
});
