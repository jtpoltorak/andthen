import { describe, expect, it } from 'vitest';
import { indexCheckIns } from './chain';
import { addDays } from './dates';
import {
  dayStatus,
  habitDays,
  habitSpan,
  habitStats,
  summarize,
  weekGrid,
  weekStart,
} from './history';
import type { CheckIn, CheckInKind, Habit, Routine } from './model';

// 2026-11-06 is a Friday.
const TODAY = '2026-11-06';
const START = '2026-10-27';

const routine = (over: Partial<Routine> = {}): Routine => ({
  id: 'morning',
  anchor: 'After I pour my coffee',
  order: 0,
  createdOn: START,
  ...over,
});

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'water',
  routineId: 'morning',
  name: 'Drink water',
  twoMinuteVersion: 'One sip',
  order: 0,
  createdOn: START,
  ...over,
});

/**
 * Builds check-ins from a pattern, one character per day starting at `from`:
 * F = full, M = mini, S = skip, . = no check-in.
 */
function pattern(text: string, from = START, habitId = 'water'): CheckIn[] {
  const kinds: Record<string, CheckInKind> = { F: 'full', M: 'mini', S: 'skip' };
  return [...text].flatMap((ch, i) =>
    kinds[ch] ? [{ habitId, date: addDays(from, i), kind: kinds[ch] }] : [],
  );
}

/** Stats for a habit that started on START, with today being the last day of the pattern. */
function statsFor(text: string, over: Partial<Habit> = {}) {
  const today = addDays(START, text.length - 1);
  return habitStats(habit(over), routine(), indexCheckIns(pattern(text)), today);
}

describe('habitSpan', () => {
  it('starts at the later of habit and routine creation, ends at the earlier archive', () => {
    expect(
      habitSpan(
        habit({ createdOn: '2026-10-01', archivedOn: '2026-11-04' }),
        routine({ createdOn: '2026-10-05', archivedOn: '2026-11-02' }),
      ),
    ).toEqual({ from: '2026-10-05', until: '2026-11-02' });
  });

  it('has no end while both are active', () => {
    expect(habitSpan(habit(), routine())).toEqual({ from: START, until: undefined });
  });
});

describe('dayStatus', () => {
  const index = indexCheckIns(pattern('F'));

  it('reports check-ins, misses, today and days outside the chain', () => {
    const h = habit({ archivedOn: '2026-11-05' });
    expect(dayStatus(h, routine(), index, START, TODAY)).toBe('full');
    expect(dayStatus(h, routine(), index, '2026-10-28', TODAY)).toBe('missed');
    expect(dayStatus(h, routine(), index, '2026-10-26', TODAY)).toBe('off');
    expect(dayStatus(h, routine(), index, '2026-11-05', TODAY)).toBe('off');
    expect(dayStatus(habit(), routine(), index, TODAY, TODAY)).toBe('open');
    expect(dayStatus(habit(), routine(), index, '2026-11-07', TODAY)).toBe('off');
  });

  it('treats a retired routine as retiring its habits', () => {
    const r = routine({ archivedOn: '2026-11-01' });
    expect(dayStatus(habit(), r, index, '2026-11-01', TODAY)).toBe('off');
  });

  it('keeps a check-in even if it falls outside the current span', () => {
    const late = habit({ createdOn: '2026-11-01' });
    expect(dayStatus(late, routine(), index, START, TODAY)).toBe('full');
  });
});

describe('habitDays', () => {
  it('lists each day in the range', () => {
    const days = habitDays(
      habit(),
      routine(),
      indexCheckIns(pattern('FM.')),
      START,
      '2026-10-30',
      '2026-10-29',
    );
    expect(days.map((d) => d.status)).toEqual(['full', 'mini', 'open', 'off']);
  });
});

describe('habitStats', () => {
  it('counts full, 2-minute and skipped days', () => {
    const s = statsFor('FFMS.F');
    expect(s).toMatchObject({ full: 3, mini: 1, skips: 1, lastDone: '2026-11-01' });
  });

  it('counts a chain of done days', () => {
    expect(statsFor('FFMF')).toMatchObject({ currentChain: 4, bestChain: 4 });
  });

  it('forgives a single miss and keeps going through skips', () => {
    expect(statsFor('FF.FSF')).toMatchObject({ currentChain: 6, bestChain: 6 });
  });

  it('ends the chain after two misses in a row, without counting them', () => {
    expect(statsFor('FFF..FF')).toMatchObject({ currentChain: 2, bestChain: 3 });
  });

  it('keeps the chain alive after one miss yesterday, waiting on today', () => {
    // Done, done, missed yesterday, today still open.
    const today = addDays(START, 3);
    const s = habitStats(habit(), routine(), indexCheckIns(pattern('FF')), today);
    expect(s.currentChain).toBe(3);
  });

  it('does not count today until it is answered', () => {
    const today = addDays(START, 2);
    const s = habitStats(habit(), routine(), indexCheckIns(pattern('FF')), today);
    expect(s.currentChain).toBe(2);
  });

  it('shows no chain after two misses up to today', () => {
    const today = addDays(START, 3);
    const s = habitStats(habit(), routine(), indexCheckIns(pattern('FF')), addDays(today, 1));
    expect(s).toMatchObject({ currentChain: 0, bestChain: 2 });
  });

  it('starts a chain only on a done day, not a skip', () => {
    expect(statsFor('SS')).toMatchObject({ currentChain: 0, bestChain: 0 });
    expect(statsFor('SSF')).toMatchObject({ currentChain: 1 });
  });

  it('stops counting once a habit is retired, but keeps its history', () => {
    const s = statsFor('FFF......', { archivedOn: addDays(START, 3) });
    expect(s).toMatchObject({ currentChain: 3, bestChain: 3, full: 3 });
  });
});

describe('weeks', () => {
  it('finds the Monday of a week', () => {
    expect(weekStart(TODAY)).toBe('2026-11-02');
    expect(weekStart('2026-11-02')).toBe('2026-11-02');
    expect(weekStart('2026-11-08')).toBe('2026-11-02');
  });

  it('builds a Monday-first grid ending with this week', () => {
    const grid = weekGrid(TODAY, 8);
    expect(grid).toHaveLength(8);
    expect(grid[0][0]).toBe('2026-09-14');
    expect(grid[7]).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ]);
  });
});

describe('summarize', () => {
  it('totals check-ins and days showed up in a span', () => {
    const checkIns = [
      ...pattern('FM.S', '2026-11-02'),
      ...pattern('F.', '2026-11-02', 'stretch'),
      ...pattern('F', '2026-10-30'), // Last week: left out.
    ];
    expect(summarize(checkIns, '2026-11-02', TODAY)).toEqual({
      full: 2,
      mini: 1,
      skips: 1,
      daysShowedUp: 2,
      daysSoFar: 5,
    });
  });
});
