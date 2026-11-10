import { describe, expect, it } from 'vitest';
import { indexCheckIns } from './chain';
import { canEditDay, gridDayShares, gridDays, habitGrid } from './grid';
import type { CheckIn, Habit, Routine } from './model';

// A Tuesday. Weeks start on Monday.
const TODAY = '2026-11-10';

const routine = (id: string, over: Partial<Routine> = {}): Routine => ({
  id,
  anchor: `After ${id}`,
  order: 0,
  createdOn: '2026-10-01',
  ...over,
});

const habit = (id: string, routineId = 'am', over: Partial<Habit> = {}): Habit => ({
  id,
  routineId,
  name: id,
  twoMinuteVersion: 'a little',
  order: 0,
  createdOn: '2026-10-01',
  ...over,
});

const check = (habitId: string, date: string, kind: CheckIn['kind'] = 'full'): CheckIn => ({
  habitId,
  date,
  kind,
});

describe('canEditDay', () => {
  it('allows today and the 6 days before it, nothing older and nothing ahead', () => {
    expect(canEditDay(TODAY, TODAY)).toBe(true);
    expect(canEditDay('2026-11-04', TODAY)).toBe(true);
    expect(canEditDay('2026-11-03', TODAY)).toBe(false);
    expect(canEditDay('2026-11-11', TODAY)).toBe(false);
  });
});

describe('gridDays', () => {
  it('lists days ending on the last one, oldest first', () => {
    expect(gridDays(TODAY, 3)).toEqual(['2026-11-08', '2026-11-09', '2026-11-10']);
    expect(gridDays('2026-11-01', 2)).toEqual(['2026-10-31', '2026-11-01']);
  });
});

describe('habitGrid', () => {
  const days = gridDays(TODAY, 7); // Nov 4 to Nov 10

  it('groups habits by routine in chain order, with a status per day', () => {
    const groups = habitGrid(
      [routine('am'), routine('pm', { order: 1 })],
      [habit('stretch', 'am', { order: 1 }), habit('water', 'am'), habit('read', 'pm')],
      indexCheckIns([
        check('water', '2026-11-09'),
        check('water', '2026-11-08', 'mini'),
        { ...check('water', '2026-11-07', 'skip'), note: 'Rained' },
      ]),
      days,
      TODAY,
    );
    expect(groups.map((g) => g.routine.id)).toEqual(['am', 'pm']);
    expect(groups[0].rows.map((r) => r.habit.id)).toEqual(['water', 'stretch']);
    const water = groups[0].rows[0];
    expect(water.cells.map((c) => c.status)).toEqual([
      'missed',
      'missed',
      'missed',
      'skip',
      'mini',
      'full',
      'open',
    ]);
    expect(water.done).toBe(2);
    // Today is still open, so it isn't asked for yet.
    expect(water.asked).toBe(6);
    expect(water.cells[3].noted).toBe(true);
    expect(water.cells[4].noted).toBe(false);
  });

  it('marks only the last 7 days, while the habit was in its chain, as editable', () => {
    const groups = habitGrid(
      [routine('am')],
      [habit('water', 'am', { createdOn: '2026-11-06' })],
      indexCheckIns([]),
      gridDays(TODAY, 10),
      TODAY,
    );
    const cells = groups[0].rows[0].cells;
    // Nov 1 to Nov 5: before the habit started. Nov 6 to Nov 10: editable.
    expect(cells.map((c) => c.editable)).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(cells[4].status).toBe('off');
  });

  it('keeps a habit retired during the span, and leaves out ones retired before it', () => {
    const groups = habitGrid(
      [routine('am'), routine('empty', { order: 1 })],
      [
        habit('recent', 'am', { archivedOn: '2026-11-08' }),
        habit('old', 'am', { archivedOn: '2026-10-20' }),
        habit('future', 'empty', { createdOn: '2026-11-11' }),
      ],
      indexCheckIns([]),
      days,
      TODAY,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].rows.map((r) => r.habit.id)).toEqual(['recent']);
    expect(groups[0].rows[0].cells.at(-1)?.status).toBe('off');
    expect(groups[0].rows[0].cells.at(-1)?.editable).toBe(false);
  });

  it('shows rest days for a weekdays habit and keeps them out of what was asked', () => {
    const groups = habitGrid(
      [routine('am')],
      [habit('journal', 'am', { schedule: { kind: 'days', days: [1, 2, 3, 4, 5] } })],
      indexCheckIns([check('journal', '2026-11-08')]),
      days,
      TODAY,
    );
    const row = groups[0].rows[0];
    // Saturday Nov 7 rests; a check-in on Sunday Nov 8 still counts.
    expect(row.cells[3].status).toBe('rest');
    expect(row.cells[4].status).toBe('full');
    expect(row.cells[3].editable).toBe(true);
  });
});

describe('gridDayShares', () => {
  it('shares each day done across habits, undefined when nothing was asked', () => {
    const days = gridDays(TODAY, 3); // Nov 8 to Nov 10
    const groups = habitGrid(
      [routine('am')],
      [habit('a'), habit('b', 'am', { order: 1, createdOn: '2026-11-09' })],
      indexCheckIns([check('a', '2026-11-08'), check('a', '2026-11-09'), check('b', '2026-11-10')]),
      days,
      TODAY,
    );
    expect(gridDayShares(groups, 3)).toEqual([1, 0.5, 0.5]);
    expect(gridDayShares([], 2)).toEqual([undefined, undefined]);
  });
});
